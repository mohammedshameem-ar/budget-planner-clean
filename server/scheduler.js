const cron = require('node-cron');
const webpush = require('web-push');
const { db, admin } = require('./config');

if (!admin) console.error('FATAL: Admin missing in scheduler');

/**
 * Main scheduler logic
 * @param {boolean} force - If true, ignores the minute-by-minute check and sends due notifications immediately
 */
async function runScheduler(force = false) {
    const now = admin.firestore.Timestamp.now();
    const nowJS = now.toDate();
    console.log(`[Scheduler] --- ${force ? 'FORCED' : 'CRON'} START ---`);
    console.log(`[Scheduler] Server Time (UTC): ${new Date().toISOString()}`);
    console.log(`[Scheduler] Firestore Time: ${nowJS.toISOString()}`);

    try {
        const usersSnap = await db.collection('users').get();
        let processedCount = 0;
        let sentCount = 0;

        for (const userDoc of usersSnap.docs) {
            try {
                const userId = userDoc.id;
                const userData = userDoc.data();
                processedCount++;

                const userTimezone = userData.timezone || 'UTC';

                // --- DAILY BUDGET SUMMARY REMINDER LOGIC ---
                const notificationsEnabled = userData.notificationsEnabled || (userData.dailyReminder && userData.dailyReminder.enabled);
                const reminderTime = userData.reminderTime || (userData.dailyReminder && userData.dailyReminder.time);

                if (notificationsEnabled && reminderTime && userTimezone) {
                    try {
                        // Get current time in user's timezone (HH:mm)
                        const formatOptions = {
                            timeZone: userTimezone,
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                        };
                        const currentLocalTimeRaw = new Intl.DateTimeFormat('en-US', formatOptions).format(nowJS);
                        const currentLocalTime = currentLocalTimeRaw.replace(/[^\d:]/g, '');

                        const todayStr = new Intl.DateTimeFormat('fr-CA', { timeZone: userTimezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(nowJS);

                        const normalizedReminderTime = reminderTime.replace(/[^\d:]/g, '');
                        let due = (currentLocalTime === normalizedReminderTime);
                        
                        if (force || currentLocalTime > normalizedReminderTime) {
                             if (force || userData.dailyReminderLastSentDate !== todayStr) {
                                 due = true;
                             }
                        }

                        if (due) {
                            let shouldSend = false;
                            await db.runTransaction(async (t) => {
                                const userRef = db.collection('users').doc(userId);
                                const userDocForTx = await t.get(userRef);
                                if (!userDocForTx.exists) return;

                                const uData = userDocForTx.data();
                                if (force || uData.dailyReminderLastSentDate !== todayStr) {
                                    t.update(userRef, {
                                        dailyReminderLastSent: now,
                                        dailyReminderLastSentDate: todayStr
                                    });
                                    shouldSend = true;
                                }
                            });

                            if (shouldSend) {
                                console.log(`[Scheduler] Sending Daily Summary for user ${userId}`);
                                const txSnap = await userDoc.ref.collection('transactionDetails').doc('history').collection('userTransactions').get();
                                const monthStr = todayStr.substring(0, 7);

                                let totalSpentToday = 0;
                                let totalSpentMonth = 0;

                                txSnap.docs.forEach(d => {
                                    const data = d.data();
                                    if (data.type === 'expense') {
                                        if (data.date === todayStr) {
                                            totalSpentToday += data.amount || 0;
                                        }
                                        if (data.date && data.date.startsWith(monthStr)) {
                                            totalSpentMonth += data.amount || 0;
                                        }
                                    }
                                });

                                 let savings = 0;

                                 const profileSettingsSnap = await userDoc.ref.collection('transactionDetails').doc('config').collection('userSettings').doc('settings').get();
                                 if (profileSettingsSnap.exists) {
                                     const pData = profileSettingsSnap.data();
                                     savings = pData.savings || 0;
                                 }

                                 // Simplified Notification Body
                                 const body = `Today spent: ₹${Math.max(0, totalSpentToday).toLocaleString('en-IN')}\n` +
                                              `Monthly spent: ₹${Math.max(0, totalSpentMonth).toLocaleString('en-IN')}\n` +
                                              `Savings: ₹${savings.toLocaleString('en-IN')}`;

                                const payload = JSON.stringify({
                                    title: 'BudgetWise Daily Summary',
                                    body: body,
                                    tag: `daily-summary-${todayStr}`,
                                    icon: '/logo.svg',
                                    badge: '/logo.svg',
                                    data: { url: '/dashboard' },
                                    timestamp: Date.now()
                                });

                                const options = {
                                    vapidDetails: {
                                        subject: `mailto:${process.env.VAPID_EMAIL}`,
                                        publicKey: process.env.VAPID_PUBLIC_KEY,
                                        privateKey: process.env.VAPID_PRIVATE_KEY
                                    },
                                    urgency: 'high',
                                    TTL: 24 * 60 * 60 // 24 hours
                                };

                                const subsSnap = await userDoc.ref.collection('pushSubscriptions').get();
                                const sendPromises = subsSnap.docs.map(d => 
                                    webpush.sendNotification(d.data(), payload, options).catch(err => {
                                        if (err.statusCode === 410 || err.statusCode === 404) return d.ref.delete();
                                    })
                                );
                                await Promise.all(sendPromises);
                                sentCount++;
                                console.log(`[Scheduler] Successfully sent daily summary to user: ${userId} (${subsSnap.size} devices)`);
                            }
                        }
                    } catch (err) {
                        console.error(`[Scheduler] Daily summary error for user ${userId}:`, err);
                    }
                }

                // --- COMPONENT REMINDERS LOGIC ---
                const remindersRef = userDoc.ref.collection('transactionDetails').doc('reminders').collection('userReminders');
                const remindersSnap = await remindersRef.where('enabled', '==', true).where('completed', '==', false).get();

                for (const remDoc of remindersSnap.docs) {
                    const reminder = remDoc.data();
                    
                    let nextTimeTS = reminder.nextNotificationTime;
                    
                    // If nextNotificationTime is missing or we are forcing, initialize it correctly using timezone
                    if (!nextTimeTS && reminder.time) {
                        try {
                            console.log(`[Scheduler] Initializing nextNotificationTime for reminder ${remDoc.id} in ${userTimezone}`);
                            
                            // Calculate local date/time for the reminder
                            const reminderDateString = reminder.date || new Intl.DateTimeFormat('fr-CA', { timeZone: userTimezone }).format(nowJS);
                            const combinedDateTime = `${reminderDateString}T${reminder.time}:00`;
                            
                            // We need to parse this local time in the user's timezone to get a proper UTC Date object
                            // Simple way: Create a string with the timezone offset or use Intl
                            const localDate = new Date(new Date(combinedDateTime).toLocaleString('en-US', { timeZone: userTimezone }));
                            const diff = new Date(combinedDateTime).getTime() - localDate.getTime();
                            const utcDate = new Date(new Date(combinedDateTime).getTime() + diff);

                            nextTimeTS = admin.firestore.Timestamp.fromDate(utcDate);
                            await remDoc.ref.update({ nextNotificationTime: nextTimeTS });
                        } catch (initErr) {
                            console.error(`[Scheduler] Failed to initialize reminder time for ${remDoc.id}:`, initErr);
                            continue;
                        }
                    }

                    if (nextTimeTS && nextTimeTS.toMillis() <= now.toMillis()) {
                        let shouldSendReminder = false;
                        await db.runTransaction(async (t) => {
                            const remSnap = await t.get(remDoc.ref);
                            const rData = remSnap.data();
                            
                            if (rData.enabled && !rData.completed && rData.nextNotificationTime.toMillis() === nextTimeTS.toMillis()) {
                                let updates = { lastSent: now };
                                if (rData.recurrence === 'one-time') {
                                    updates.completed = true;
                                } else {
                                    const nextOccurrence = calculateNextTime(rData.nextNotificationTime.toDate(), rData.recurrence || 'daily');
                                    updates.nextNotificationTime = admin.firestore.Timestamp.fromDate(nextOccurrence);
                                }
                                t.update(remDoc.ref, updates);
                                shouldSendReminder = true;
                            }
                        });

                        if (shouldSendReminder) {
                            console.log(`[Scheduler] Sending Reminder for user ${userId}: ${reminder.notes}`);
                            const payload = JSON.stringify({
                                title: 'BudgetWise Reminder',
                                body: reminder.notes || 'Reminder!',
                                tag: `reminder-${remDoc.id}`,
                                icon: '/logo.svg',
                                badge: '/logo.svg',
                                data: { url: '/settings' },
                                timestamp: Date.now()
                            });

                            const options = { TTL: 3600, urgency: 'high' };

                            const subsSnap = await userDoc.ref.collection('pushSubscriptions').get();
                            const sendPromises = subsSnap.docs.map(d => 
                                webpush.sendNotification(d.data(), payload, options).catch(err => {
                                    if (err.statusCode === 410 || err.statusCode === 404) return d.ref.delete();
                                })
                            );
                            await Promise.all(sendPromises);
                            sentCount++;
                            console.log(`[Scheduler] Successfully sent reminder "${reminder.notes}" to user: ${userId} (${subsSnap.size} devices)`);
                        }
                    }
                }
                if (processedCount % 10 === 0) {
                    console.log(`[Scheduler] Progress: ${processedCount} users processed so far...`);
                }
            } catch (userErr) {
                console.error(`[Scheduler] Error processing user ${userDoc.id}:`, userErr);
                // Continue to next user
            }
        }
        console.log(`[Scheduler] --- FINISHED ---`);
        console.log(`[Scheduler] Summary: Processed: ${processedCount}, Notifications Sent: ${sentCount}`);
        return { processedCount, sentCount };
    } catch (error) {
        console.error('[Scheduler] CRITICAL ERROR in runScheduler:', error);
        throw error;
    }
}

function calculateNextTime(currentDate, recurrence) {
    const next = new Date(currentDate);
    if (recurrence === 'daily') next.setDate(next.getDate() + 1);
    else if (recurrence === 'weekly') next.setDate(next.getDate() + 7);
    else if (recurrence === 'monthly') next.setMonth(next.getMonth() + 1);
    else next.setDate(next.getDate() + 1); // default daily
    return next;
}

// Actual Cron Job (runs every minute)
cron.schedule('* * * * *', () => {
    const timestamp = new Date().toISOString();
    console.log(`[Scheduler] Background Heartbeat - ${timestamp}`);
    runScheduler(false).catch(err => console.error('[Scheduler] Cron failed:', err));
});

module.exports = { runScheduler };
