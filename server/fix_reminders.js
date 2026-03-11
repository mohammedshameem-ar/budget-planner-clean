const { db } = require('./config');

async function fixReminders() {
    console.log("Starting reminders backfill...");
    try {
        const usersSnap = await db.collection('users').get();
        let fixedCount = 0;

        for (const userDoc of usersSnap.docs) {
            const remindersSnap = await userDoc.ref.collection('reminders').get();
            for (const remDoc of remindersSnap.docs) {
                const data = remDoc.data();
                if (data.completed === undefined) {
                    await remDoc.ref.update({ completed: false });
                    console.log(`Fixed reminder ${remDoc.id} for user ${userDoc.id}`);
                    fixedCount++;
                }
            }
        }
        console.log(`Backfill complete. Fixed ${fixedCount} reminders.`);
    } catch (e) {
        console.error("Backfill failed:", e);
    }
    process.exit(0);
}

fixReminders();
