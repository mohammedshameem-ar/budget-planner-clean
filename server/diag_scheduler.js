const { db, admin } = require('./config');

async function diagnose() {
    try {
        console.log("--- Scheduler Diagnosis ---");
        const usersSnap = await db.collection('users').get();
        console.log(`Found ${usersSnap.size} users.`);

        for (const userDoc of usersSnap.docs) {
            const userData = userDoc.data();
            console.log(`\nUser: ${userDoc.id} (${userData.email || 'N/A'})`);
            console.log(`- notificationsEnabled: ${userData.notificationsEnabled}`);
            console.log(`- reminderTime: ${userData.reminderTime}`);
            console.log(`- timezone: ${userData.timezone}`);
            console.log(`- dailyReminder (legacy):`, userData.dailyReminder);

            // Check reminders
            const remindersSnap = await userDoc.ref.collection('transactionDetails').doc('reminders').collection('userReminders').get();
            console.log(`- Active Reminders: ${remindersSnap.size}`);
            remindersSnap.docs.forEach(rd => {
                const r = rd.data();
                console.log(`  [${rd.id}] notes: "${r.notes}", enabled: ${r.enabled}, next: ${r.nextNotificationTime ? r.nextNotificationTime.toDate().toISOString() : 'MISSING'}`);
            });

            // Check subscriptions
            const subsSnap = await userDoc.ref.collection('pushSubscriptions').get();
            console.log(`- Push Subscriptions: ${subsSnap.size}`);
        }
    } catch (e) {
        console.error("Diagnosis failed:", e);
    }
    process.exit(0);
}

diagnose();
