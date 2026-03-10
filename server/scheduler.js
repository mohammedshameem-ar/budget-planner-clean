const cron = require('node-cron');
const webpush = require('web-push');
const { db, admin } = require('./config');
if (!admin) console.error('FATAL: Admin missing in scheduler');

// Check every minute
cron.schedule('* * * * *', async () => {
    const now = admin.firestore.Timestamp.now();
    console.log(`[Scheduler] Checking for reminders at ${new Date().toISOString()}...`);

    try {
        // Query users
        const usersSnap = await db.collection('users').get();
        console.log(`[Scheduler] Found ${usersSnap.size} user(docs) in the 'users' collection.`);

        for (const userDoc of usersSnap.docs) {
            const userId = userDoc.id;
            const userData = userDoc.data();
            console.log(`[Scheduler] Processing user: ${userId} (${userData.email || 'no email'})`);

            // --- DAILY BUDGET SUMMARY REMINDER LOGIC ---
            // Check both root fields and legacy dailyReminder object
            const notificationsEnabled = userData.notificationsEnabled || (userData.dailyReminder && userData.dailyReminder.enabled);
            const reminderTime = userData.reminderTime || (userData.dailyReminder && userData.dailyReminder.time);
            const timezone = userData.timezone || (userData.dailyReminder && userData.dailyReminder.timezone);

            if (!notificationsEnabled) {
                console.log(`[Scheduler] User ${userId}: Notifications disabled (root or legacy).`);
            } else if (!reminderTime || !timezone) {
                console.log(`[Scheduler] User ${userId}: Missing reminderTime (${reminderTime}) or timezone (${timezone}).`);
            } else {
                try {
                    // Get current time in user's timezone formatted as HH:mm
                    const currentLocalTime = new Intl.DateTimeFormat('en-US', {
                        timeZone: timezone,
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                    }).format(now.toDate());

                    // If the current HH:mm matches the scheduled HH:mm
                    if (currentLocalTime === reminderTime) {
                        // Compute today's date string in the user's timezone (YYYY-MM-DD)
                        const nowInTimezone = now.toDate();
                        const todayStr = new Intl.DateTimeFormat('fr-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(nowInTimezone);
                        const monthStr = todayStr.substring(0, 7); // YYYY-MM

                        // USE TRANSACTION to ensure only ONE server instance sends this today
                        let shouldSend = false;
                        try {
                            await db.runTransaction(async (t) => {
                                const userRef = db.collection('users').doc(userId);
                                const userDocForTx = await t.get(userRef);
                                if (!userDocForTx.exists) return;

                                const uData = userDocForTx.data();
                                if (uData.dailyReminderLastSentDate !== todayStr) {
                                    // Not sent today yet - LOCK it now
                                    t.update(userRef, {
                                        dailyReminderLastSent: now,
                                        dailyReminderLastSentDate: todayStr
                                    });
                                    shouldSend = true;
                                }
                            });
                        } catch (txErr) {
                            console.error(`[Scheduler] Transaction failed for user ${userId}:`, txErr);
                        }

                        if (shouldSend) {
                            console.log(`[Scheduler] Transaction secured! Sending Daily Summary for user ${userId} at ${reminderTime}`);
                            const txSnap = await userDoc.ref.collection('transactions').where('type', '==', 'expense').get();

                            let totalSpentToday = 0;
                            let totalSpentMonth = 0;

                            txSnap.docs.forEach(d => {
                                const data = d.data();
                                // Match the YYYY-MM-DD format for today
                                if (data.date === todayStr) {
                                    totalSpentToday += data.amount || 0;
                                }
                                // Match the YYYY-MM format for the month
                                if (data.date && data.date.startsWith(monthStr)) {
                                    totalSpentMonth += data.amount || 0;
                                }
                            });

                            // Fetch budget limit from user profile
                            let budgetLimit = 0;
                            const profileSettingsSnap = await userDoc.ref.collection('profile').doc('settings').get();
                            // In Firebase Admin SDK, exists is a boolean property, not a function
                            if (profileSettingsSnap.exists) {
                                budgetLimit = profileSettingsSnap.data().budgetLimit || 0;
                            }

                            const remaining = budgetLimit - totalSpentMonth;

                            let summaryBody = `Today's Spent: ₹${totalSpentToday}\n`;
                            summaryBody += `Monthly Spent: ₹${totalSpentMonth}\n`;
                            summaryBody += `Monthly Limit: ₹${budgetLimit}\n`;
                            summaryBody += `Monthly Remaining: ₹${remaining}`;

                            const payload = JSON.stringify({
                                title: 'BudgetWise Daily Summary',
                                body: summaryBody,
                                icon: '/logo.svg',
                                badge: '/logo.svg',
                                // Fixed daily tag — browser replaces any duplicate instead of showing two
                                tag: `daily-summary-${todayStr}`
                            });

                            const subscriptionsSnap = await userDoc.ref.collection('pushSubscriptions').get();
                            if (!subscriptionsSnap.empty) {
                                // Deduplicate by endpoint — keep first, delete extras permanently
                                const seen = new Set();
                                const toDelete = [];
                                const subscriptions = [];

                                for (const d of subscriptionsSnap.docs) {
                                    const sub = d.data();
                                    if (seen.has(sub.endpoint)) {
                                        toDelete.push(d.ref.delete()); // remove duplicate from Firestore
                                        continue;
                                    }
                                    seen.add(sub.endpoint);
                                    subscriptions.push({ ref: d.ref, data: sub });
                                }

                                if (toDelete.length > 0) {
                                    await Promise.all(toDelete);
                                    console.log(`[Scheduler] Deleted ${toDelete.length} duplicate subscription(s) for user ${userId}`);
                                }

                                const sendPromises = subscriptions.map(sub =>
                                    webpush.sendNotification(sub.data, payload).catch(err => {
                                        if (err.statusCode === 410 || err.statusCode === 404) {
                                            return sub.ref.delete();
                                        }
                                    })
                                );
                                await Promise.all(sendPromises);

                                // Log to notification history
                                await userDoc.ref.collection('notificationHistory').add({
                                    title: 'BudgetWise Daily Summary',
                                    body: summaryBody,
                                    sentAt: now,
                                    type: 'daily-summary'
                                });

                                console.log(`[Scheduler] Daily summary sent to user ${userId} for ${todayStr}`);
                            }
                        } // end else (not already sent today)
                    }
                } catch (tzError) {
                    console.error(`[Scheduler] Timezone formatting error for user ${userId}:`, tzError);
                }
            }


            // --- COMPONENT REMINDERS LOGIC ---

            // Check reminders for this user
            // In a real production app, you'd want a flattened 'reminders' collection 
            // queryable by time to avoid reading ALL users. 
            // For this scale, iterating users is acceptable for now or we create a composite index.
            // Let's optimize slightly: Query reminders subcollection.

            const remindersRef = userDoc.ref.collection('reminders');
            // We'll simplisticly fetch active ones and filter in code for this MVP to avoid index creation wait time.
            const snapshot = await remindersRef.where('enabled', '==', true).get();

            if (snapshot.empty) continue;

            const subscriptionsSnap = await userDoc.ref.collection('pushSubscriptions').get();
            if (subscriptionsSnap.empty) continue;

            // Deduplicate by endpoint so same device doesn't get double notifications
            const seenEndpoints = new Set();
            const subscriptions = subscriptionsSnap.docs
                .map(d => ({ ref: d.ref, data: d.data() }))
                .filter(sub => {
                    if (seenEndpoints.has(sub.data.endpoint)) return false;
                    seenEndpoints.add(sub.data.endpoint);
                    return true;
                });

            for (const remDoc of snapshot.docs) {
                const reminder = remDoc.data();

                // Skip completed ones since we only queried for enabled
                if (reminder.completed === true) continue;

                if (!reminder.nextNotificationTime) continue;

                if (reminder.nextNotificationTime.toMillis() <= now.toMillis()) {
                    // USE TRANSACTION to ensure only ONE server instance sends this specific reminder
                    let shouldSendReminder = false;
                    let updatedReminderData = null;

                    try {
                        await db.runTransaction(async (t) => {
                            const remRef = remindersRef.doc(remDoc.id);
                            const remSnap = await t.get(remRef);
                            if (!remSnap.exists) return;

                            const rData = remSnap.data();

                            // Double check if already processed (lastSent same as nextNotificationTime)
                            if (rData.enabled && !rData.completed &&
                                rData.nextNotificationTime.toMillis() === reminder.nextNotificationTime.toMillis()) {

                                // Update recurrence and lastSent atomically
                                let updates = {
                                    lastSent: now
                                };

                                if (rData.recurrence === 'one-time') {
                                    updates.completed = true;
                                } else {
                                    const nextTime = calculateNextTime(rData.nextNotificationTime.toDate(), rData.recurrence);
                                    updates.nextNotificationTime = admin.firestore.Timestamp.fromDate(nextTime);
                                }

                                t.update(remRef, updates);
                                shouldSendReminder = true;
                                updatedReminderData = { ...rData, ...updates };
                            }
                        });
                    } catch (txErr) {
                        console.error(`[Scheduler] Reminder transaction failed for user ${userId}, reminder ${remDoc.id}:`, txErr);
                    }

                    if (shouldSendReminder) {
                        console.log(`[Scheduler] Transaction secured! Sending reminder: ${reminder.notes} to user ${userId}`);

                        const payload = JSON.stringify({
                            title: 'BudgetWise Reminder',
                            body: reminder.notes || 'Time for your reminder!',
                            icon: '/logo.svg',
                            badge: '/logo.svg',
                            tag: `reminder-${remDoc.id}`
                        });

                        // Send to all subscriptions
                        const sendPromises = subscriptions.map(sub =>
                            webpush.sendNotification(sub.data, payload).catch(err => {
                                if (err.statusCode === 410 || err.statusCode === 404) {
                                    return sub.ref.delete();
                                }
                            })
                        );

                        await Promise.all(sendPromises);

                        // Log history
                        await userDoc.ref.collection('notificationHistory').add({
                            title: 'BudgetWise Reminder',
                            body: reminder.notes,
                            sentAt: now,
                            reminderId: remDoc.id
                        });
                    }
                }
            }
        }

    } catch (error) {
        console.error('[Scheduler] Error:', error);
    }
});

function calculateNextTime(currentDate, recurrence) {
    const next = new Date(currentDate);
    if (recurrence === 'daily') {
        next.setDate(next.getDate() + 1);
    } else if (recurrence === 'weekly') {
        next.setDate(next.getDate() + 7);
    } else if (recurrence === 'monthly') {
        next.setMonth(next.getMonth() + 1);
    }
    return next;
}
