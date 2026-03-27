const cron = require('node-cron');
const webpush = require('web-push');
const { db, admin } = require('./config');
// Note: dotenv.config() is already called in index.js before requiring this

if (!admin || !db) {
    console.error('FATAL: Firebase Admin or Firestore DB is not initialized. Notifications will not be sent.');
}

// VAPID keys — use env vars, fall back to hardcoded for resilience
const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY  || 'BN2C6tcs6OyhPqvI8bZzsn2d-SsicZDOhjf4lAUSR4mlJIfcKv9JKqq19UFjdBNMwseDrC_UOq9k1taqHo3pmmI';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || 'A8jnngta4_lqRlJ663EYOfupGelrhq-CbsFTmqiI1vg';
let VAPID_EMAIL_RAW = process.env.VAPID_EMAIL       || 'mailto:admin@budgetwise.app';

if (VAPID_EMAIL_RAW && !VAPID_EMAIL_RAW.startsWith('mailto:') && !VAPID_EMAIL_RAW.startsWith('http')) {
    VAPID_EMAIL_RAW = `mailto:${VAPID_EMAIL_RAW}`;
}

// Set VAPID details once at module load — used by both scheduler and index.js
try {
    webpush.setVapidDetails(VAPID_EMAIL_RAW, VAPID_PUBLIC, VAPID_PRIVATE);
    console.log('[Scheduler] VAPID details configured.');
} catch(e) {
    console.error('[Scheduler] VAPID setup failed:', e.message);
}

// Export the normalized email for use in payload options
const VAPID_EMAIL = VAPID_EMAIL_RAW;

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
                        // Use en-GB for consistent HH:mm format without AM/PM or 24:00 glitches
                        const currentLocalTimeRaw = new Intl.DateTimeFormat('en-GB', formatOptions).format(nowJS);
                        const currentLocalTime = currentLocalTimeRaw.replace(/[^\d:]/g, '');

                        const todayStr = new Intl.DateTimeFormat('fr-CA', { timeZone: userTimezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(nowJS);
                        const normalizedReminderTime = reminderTime.replace(/[^\d:]/g, '');

                        // CATCH-UP LOGIC:
                        // Instead of exact minute match (===), we check if current time is >= reminder time.
                        // Since we track 'dailyReminderLastSentDate', it will only fire ONCE per day,
                        // even if the server wakes up late (e.g. scheduled 08:00, wakes up 08:05).
                        const timeMatches = (currentLocalTime >= normalizedReminderTime);
                        const notSentToday = (userData.dailyReminderLastSentDate !== todayStr || !userData.dailyReminderLastSentDate);
                        const due = force ? true : (timeMatches && notSentToday);

                        if (due) {
                            let shouldSend = false;
                            await db.runTransaction(async (t) => {
                                const userRef = db.collection('users').doc(userId);
                                const userDocForTx = await t.get(userRef);
                                if (!userDocForTx.exists) return;

                                const uData = userDocForTx.data();
                                // Double check inside transaction to prevent double-send races
                                const lastSentDate = uData.dailyReminderLastSentDate;
                                
                                if (force) {
                                    shouldSend = true;
                                } else if (lastSentDate !== todayStr) {
                                    t.update(userRef, {
                                        dailyReminderLastSent: now,
                                        dailyReminderLastSentDate: todayStr
                                    });
                                    shouldSend = true;
                                }
                            });

                            if (shouldSend) {
                                console.log(`[Scheduler] Sending Daily Summary for user ${userId} (Scheduled: ${normalizedReminderTime}, Actual: ${currentLocalTime})`);
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

                                 let budgetLimit = 0;
                                 let savings = 0;

                                 const profileSettingsSnap = await userDoc.ref.collection('transactionDetails').doc('config').collection('userSettings').doc('settings').get();
                                 if (profileSettingsSnap.exists) {
                                     const pData = profileSettingsSnap.data();
                                     budgetLimit = pData.budgetLimit || 0;
                                     savings     = pData.savings    || 0;
                                 }

                                 // Rich Notification Body with budget context
                                 const budgetRemaining = budgetLimit > 0 ? Math.max(0, budgetLimit - totalSpentMonth) : null;
                                 const usagePct = budgetLimit > 0 ? Math.min(100, Math.round((totalSpentMonth / budgetLimit) * 100)) : null;
                                 const barFilled = usagePct !== null ? Math.round(usagePct / 10) : 0;
                                 const bar = usagePct !== null ? `[${'\u2588'.repeat(barFilled)}${'\u2591'.repeat(10 - barFilled)}] ${usagePct}%` : '';

                                 const bodyLines = [
                                     `Total spend:   \u20b9${Math.max(0, totalSpentToday).toLocaleString('en-IN')}`,
                                     `Monthly spend: \u20b9${Math.max(0, totalSpentMonth).toLocaleString('en-IN')}`,
                                 ];
                                 if (savings > 0) bodyLines.push(`Savings:       \u20b9${savings.toLocaleString('en-IN')}`);
                                 const body = bodyLines.join('\n');

                                 const payload = JSON.stringify({
                                    title: 'BudgetWise Summary',
                                    body,
                                    tag: `daily-summary-${todayStr}`,
                                    icon: 'https://news-9d3d2.web.app/logo.svg',
                                    badge: 'https://news-9d3d2.web.app/logo.svg',
                                    vibrate: [200, 100, 200],
                                    actions: [
                                        { action: 'open', title: '📊 Open App' },
                                        { action: 'dismiss', title: 'Dismiss' }
                                    ],
                                    data: { url: 'https://news-9d3d2.web.app/dashboard' },
                                    timestamp: Date.now()
                                });

                                 const options = {
                                    TTL: 24 * 60 * 60, // 24 hours - queued if device is off
                                    urgency: 'high'
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
                                title: '⏰ BudgetWise Reminder',
                                body: (reminder.notes || 'Reminder!'),
                                tag: `reminder-${remDoc.id}`,
                                icon: 'https://news-9d3d2.web.app/logo.svg',
                                badge: 'https://news-9d3d2.web.app/logo.svg',
                                data: { url: 'https://news-9d3d2.web.app/settings' },
                                timestamp: Date.now()
                            });

                             const options = {
                                TTL: 24 * 60 * 60, // 24 hours
                                urgency: 'high'
                            };

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
