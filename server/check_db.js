const { db } = require('./config');

async function checkUsers() {
    console.log('--- Checking Users Collection ---');
    const usersSnap = await db.collection('users').get();
    console.log('Total documents in users collection:', usersSnap.size);
    usersSnap.forEach(doc => {
        console.log('Found User Doc:', doc.id, doc.data());
    });

    console.log('\n--- Checking for Subscription Collections ---');
    const subs = await db.collectionGroup('pushSubscriptions').get();
    console.log('Total subscriptions found across all users:', subs.size);
    subs.forEach(doc => {
        console.log('Sub for user:', doc.ref.parent.parent.id, 'id:', doc.id);
    });
}

checkUsers().catch(console.error);
