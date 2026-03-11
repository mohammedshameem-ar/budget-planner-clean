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
    console.log(`[Scheduler] ${force ? 'FORCED' : 'Cron'} check at ${nowJS.toISOString()}...`);

    try {
        const usersSnap = await db.collection('users').get();
        let processedCount = 0;
        let sentCount = 0;

        for (const userDoc of usersSnap.docs) {
            const userId = userDoc.id;
            const userData = userDoc.data();
            processedCount++;

            // --- DAILY BUDGET SUMMARY REMINDER LOGIC ---
            const notificationsEnabled = userData.notificationsEnabled || (userData.dailyReminder && userData.dailyReminder.enabled);
            const reminderTime = userData.reminderTime || (userData.dailyReminder && userData.dailyReminder.time);
            const timezone = userData.timezone || (userData.dailyReminder && userData.dailyReminder.timezone);

            if (notificationsEnabled && reminderTime && timezone) {
                try {
                    // Get current time in user's timezone (HH:mm)
                    const formatOptions = {
                        timeZone: timezone,
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                    };
                    const currentLocalTimeRaw = new Intl.DateTimeFormat('en-US', formatOptions).format(nowJS);
                    // Strip any Unicode control characters (like \u200e) that Intl sometimes adds
                    const currentLocalTime = currentLocalTimeRaw.replace(/[^\d:]/g, '');

                    const todayStr = new Intl.DateTimeFormat('fr-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(nowJS);

                    // LOGIC: Should we send daily summary?
                    // 1. If it's the exact minute (Cron mode)
                    // 2. OR if it's PAST the time today and hasn't been sent yet (Missed/Forced mode)
                    const normalizedReminderTime = reminderTime.replace(/[^\d:]/g, '');
                    let due = (currentLocalTime === normalizedReminderTime);
                    
                    if (force || currentLocalTime > normalizedReminderTime) {
                         if (userData.dailyReminderLastSentDate !== todayStr) {
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
                            if (uData.dailyReminderLastSentDate !== todayStr) {
                                t.update(userRef, {
                                    dailyReminderLastSent: now,
                                    dailyReminderLastSentDate: todayStr
                                });
                                shouldSend = true;
                            }
                        });

                        if (shouldSend) {
                            console.log(`[Scheduler] Sending Daily Summary for user ${userId}`);
                            const txSnap = await userDoc.ref.collection('transactions').get();
                            const monthStr = todayStr.substring(0, 7);

                            let totalSpentToday = 0;
                            let totalSpentMonth = 0;
                            const todayCategoryTotals = {};

                            txSnap.docs.forEach(d => {
                                const data = d.data();
                                if (data.type === 'expense') {
                                    if (data.date === todayStr) {
                                        totalSpentToday += data.amount || 0;
                                        todayCategoryTotals[data.category] = (todayCategoryTotals[data.category] || 0) + (data.amount || 0);
                                    }
                                    if (data.date && data.date.startsWith(monthStr)) {
                                        totalSpentMonth += data.amount || 0;
                                    }
                                }
                            });

                            let highestCategory = 'None';
                            let highestCategoryAmount = 0;
                            Object.entries(todayCategoryTotals).forEach(([cat, amt]) => {
                                if (amt > highestCategoryAmount) {
                                    highestCategoryAmount = amt;
                                    highestCategory = cat;
                                }
                            });

                            let budgetLimit = 0;
                            let income = 0;
                            let incomeEnabled = true;
                            let budgetEnabled = true;
                            const profileSettingsSnap = await userDoc.ref.collection('profile').doc('settings').get();
                            if (profileSettingsSnap.exists) {
                                const pData = profileSettingsSnap.data();
                                budgetLimit = pData.budgetLimit || 0;
                                income = pData.income || 0;
                                incomeEnabled = pData.incomeEnabled !== false;
                                budgetEnabled = typeof pData.budgetEnabled === 'boolean' ? pData.budgetEnabled : true;
                            }

                            let remaining = 'None';
                            if (budgetEnabled && budgetLimit > 0) {
                                remaining = `₹${(budgetLimit - totalSpentMonth).toLocaleString('en-IN')}`;
                            }

                            let availableBalanceStr = '';
                            if (incomeEnabled && budgetEnabled && income > 0) {
                                availableBalanceStr = `\nAvailable Balance: ₹${(income - totalSpentMonth).toLocaleString('en-IN')}`;
                            }

                            const highCatStr = highestCategory !== 'None' ? `\nOverspent: ${highestCategory.charAt(0).toUpperCase() + highestCategory.slice(1)} (₹${highestCategoryAmount.toLocaleString('en-IN')})` : '';

                            const payload = JSON.stringify({
                                title: 'BudgetWise Daily Summary',
                                body: `Today: ₹${totalSpentToday.toLocaleString('en-IN')}${highCatStr}\nMonth: ₹${totalSpentMonth.toLocaleString('en-IN')}\nRemaining: ${remaining}${availableBalanceStr}`,
                                tag: `daily-summary-${todayStr}`,
                                icon: '/logo.svg',
                                badge: '/logo.svg'
                            });

                            const subsSnap = await userDoc.ref.collection('pushSubscriptions').get();
                            const sendPromises = subsSnap.docs.map(d => 
                                webpush.sendNotification(d.data(), payload).catch(err => {
                                    if (err.statusCode === 410 || err.statusCode === 404) return d.ref.delete();
                                })
                            );
                            await Promise.all(sendPromises);
                            sentCount++;
                            console.log(`[Scheduler] Successfully sent daily summary to ${userId}`);
                        }
                    }
                } catch (err) {
                    console.error(`[Scheduler] Daily summary error for user ${userId}:`, err);
                }
            }

            // --- COMPONENT REMINDERS LOGIC ---
            const remindersRef = userDoc.ref.collection('reminders');
            const remindersSnap = await remindersRef.where('enabled', '==', true).where('completed', '==', false).get();

            for (const remDoc of remindersSnap.docs) {
                const reminder = remDoc.data();
                
                // If nextNotificationTime is missing but we have time/recurrence, initialize it
                let nextTimeTS = reminder.nextNotificationTime;
                if (!nextTimeTS && reminder.time) {
                    console.log(`[Scheduler] Initializing missing nextNotificationTime for reminder ${remDoc.id}`);
                    const [h, m] = reminder.time.split(':').map(Number);
                    const initDate = new Date(nowJS);
                    initDate.setHours(h, m, 0, 0);
                    nextTimeTS = admin.firestore.Timestamp.fromDate(initDate);
                    // Update it in Firestore so we don't keep re-initializing
                    await remDoc.ref.update({ nextNotificationTime: nextTimeTS });
                }

                
                console.log(`[Scheduler] Checking reminder ${remDoc.id} for user ${userId}. Next: ${nextTimeTS ? nextTimeTS.toDate().toISOString() : 'NULL'}, Now: ${nowJS.toISOString()}`);

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
                            badge: '/logo.svg'
                        });

                        const subsSnap = await userDoc.ref.collection('pushSubscriptions').get();
                        const sendPromises = subsSnap.docs.map(d => 
                            webpush.sendNotification(d.data(), payload).catch(err => {
                                if (err.statusCode === 410 || err.statusCode === 404) return d.ref.delete();
                            })
                        );
                        await Promise.all(sendPromises);
                        sentCount++;
                        console.log(`[Scheduler] Successfully sent reminder "${reminder.notes}" to ${userId}`);
                    }
                }
            }
        }
        return { processedCount, sentCount };
    } catch (error) {
        console.error('[Scheduler] Critical loop error:', error);
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
