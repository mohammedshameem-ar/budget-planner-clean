const { db } = require('./config');
async function test() {
    try {
        const snap = await db.collection('users').limit(1).get();
        if (!snap.empty) {
            const userDoc = snap.docs[0];
            console.log("exists type on DocumentSnapshot:", typeof userDoc.exists);
        } else {
            console.log("No users found");
        }
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
test();
