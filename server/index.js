const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const webpush = require('web-push');
const { db, admin } = require('./config');
require('dotenv').config();
console.log('Index.js loaded. VAPID_PUBLIC_KEY from env:', process.env.VAPID_PUBLIC_KEY ? 'Present' : 'Missing');
require('./scheduler'); // Start the scheduler

const app = express();

// Relaxed CORS for debugging production issues
app.use(cors({
    origin: true, // Echoes the request origin, allowing anything
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Log all requests to see what hits the server
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Origin: ${req.get('origin')}`);
    next();
});

app.use(bodyParser.json());

app.get("/", (req, res) => {
    res.send("Backend is running 🚀");
});

// VAPID Keys - Use environment variables for deployment (Option 2)
const publicVapidKey = process.env.VAPID_PUBLIC_KEY || 'BHzkrEBTFz7BYesVUVnnymS-INpyRibtu7r3rlWURmDim2BcjtDBdna4-cXXpiBQv1xlerGT83jp_VqOQ6glE5M';
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || 'Nu1ixngRDtZgLxCtNGlQGv3aUsZmwjH3QIRjA8v0jI0';
const vapidEmail = process.env.VAPID_EMAIL || 'mailto:mohammedshameem.ar@gmail.com';

// Setup web-push
webpush.setVapidDetails(
    vapidEmail,
    publicVapidKey,
    privateVapidKey
);

// Debug endpoint to check keys (safe to show public key)
app.get('/api/vapid-public-key', (req, res) => {
    res.json({ publicKey: publicVapidKey });
});

// Store subscription
app.post('/api/subscribe', async (req, res) => {
    const { subscription, userId } = req.body;

    if (!userId || !subscription) {
        return res.status(400).json({ error: 'Missing userId or subscription' });
    }

    try {
        // Safely serialize subscription - spreading a PushSubscription object loses
        // the 'keys' property because it is a prototype getter, not an own property.
        // JSON parse/stringify converts it to a plain object with all fields.
        const subData = JSON.parse(JSON.stringify(subscription));

        if (!subData.endpoint || !subData.keys || !subData.keys.p256dh || !subData.keys.auth) {
            console.error('[Subscribe] Invalid subscription object received:', subData);
            return res.status(400).json({ error: 'Invalid subscription: missing endpoint or keys.' });
        }

        const subsRef = db.collection('users').doc(userId).collection('pushSubscriptions');

        // Upsert: if this endpoint already exists for this user, update it; otherwise add new
        const existing = await subsRef.where('endpoint', '==', subData.endpoint).limit(1).get();
        if (!existing.empty) {
            // Update the existing record with fresh keys (in case they changed)
            await existing.docs[0].ref.set({
                ...subData,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                ua: req.get('User-Agent')
            });
            console.log('[Subscribe] Updated existing subscription for user:', userId);
            return res.status(200).json({ message: 'Subscription updated.' });
        }

        await subsRef.add({
            ...subData,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            ua: req.get('User-Agent')
        });
        console.log('[Subscribe] New subscription stored for user:', userId);
        res.status(201).json({ message: 'Subscription stored successfully.' });
    } catch (error) {
        console.error('Error storing subscription:', error);
        res.status(500).json({ error: 'Failed to store subscription.' });
    }
});

// Test Notification Trigger
app.post('/api/test-notification', async (req, res) => {
    const { userId } = req.body;

    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    try {
        const subscriptionsSnap = await db.collection('users').doc(userId).collection('pushSubscriptions').get();

        if (subscriptionsSnap.empty) {
            return res.status(404).json({ error: 'No subscriptions found for user.' });
        }

        const payload = JSON.stringify({
            title: 'Test Notification',
            body: 'This is a test from BudgetWise!',
            icon: '/logo.svg',
            badge: '/logo.svg',
            tag: 'test-notification'   // stable tag — replaces previous test notification, no duplicates
        });

        let successCount = 0;
        let failureCount = 0;

        // Deduplicate by endpoint: keep only the first doc per unique endpoint,
        // delete any extras so they don't cause double notifications in the future
        const seen = new Set();
        const toDelete = [];
        const uniqueDocs = [];

        for (const doc of subscriptionsSnap.docs) {
            const sub = doc.data();

            // Delete subscriptions that are missing keys (created by old buggy code)
            if (!sub.keys || !sub.keys.p256dh || !sub.keys.auth) {
                console.warn('[Test] Deleting invalid subscription (no keys):', doc.id);
                toDelete.push(doc.ref.delete());
                failureCount++;
                continue;
            }

            if (seen.has(sub.endpoint)) {
                // Duplicate endpoint — delete the extra entry from Firestore
                console.warn('[Test] Deleting duplicate subscription endpoint for user:', userId);
                toDelete.push(doc.ref.delete());
                continue;
            }

            seen.add(sub.endpoint);
            uniqueDocs.push({ ref: doc.ref, data: sub });
        }

        // Clean up duplicates and invalid entries first
        if (toDelete.length > 0) await Promise.all(toDelete);

        let firstError = null;
        // Send only to unique endpoints
        const promises = uniqueDocs.map(({ ref, data: sub }) =>
            webpush.sendNotification(sub, payload)
                .then(() => { successCount++; })
                .catch(err => {
                    console.error('[Test] Error sending notification:', err);
                    let errMsg = err.message || 'Unknown error';
                    if (err.statusCode) {
                        errMsg = `[${err.statusCode}] ${errMsg}`;
                        if (err.body) errMsg += ` - ${err.body.trim()}`;
                    }
                    if (!firstError) firstError = errMsg;
                    failureCount++;
                    if (err.statusCode === 410 || err.statusCode === 404) {
                        return ref.delete();
                    }
                })
        );

        await Promise.all(promises);
        res.json({ 
            message: 'Test notification processed.', 
            successCount, 
            failureCount,
            error: firstError,
            endpoints: uniqueDocs.map(({ data: sub }) => {
                const url = sub.endpoint || '';
                return url.length > 20 ? '...' + url.slice(-20) : url;
            })
        });

    } catch (error) {
        console.error('Test notification failed:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Cleanup endpoint: removes all broken subscriptions for a user (missing keys)
app.delete('/api/subscriptions/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const subsSnap = await db.collection('users').doc(userId).collection('pushSubscriptions').get();
        let deleted = 0;
        const deletePromises = subsSnap.docs.map(async doc => {
            const sub = doc.data();
            if (!sub.keys || !sub.keys.p256dh || !sub.keys.auth) {
                await doc.ref.delete();
                deleted++;
            }
        });
        await Promise.all(deletePromises);
        res.json({ message: `Cleanup complete. Removed ${deleted} invalid subscriptions.` });
    } catch (error) {
        console.error('Cleanup error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Debug endpoint: shows how many subscriptions a user has (valid vs broken)
app.get('/api/subscriptions/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const subsSnap = await db.collection('users').doc(userId).collection('pushSubscriptions').get();
        let valid = 0, broken = 0;
        subsSnap.docs.forEach(doc => {
            const sub = doc.data();
            if (sub.keys && sub.keys.p256dh && sub.keys.auth) valid++;
            else broken++;
        });
        console.log(`[Debug] User ${userId}: ${valid} valid, ${broken} broken subscriptions`);
        res.json({ total: subsSnap.size, valid, broken });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Full reset: delete ALL subscriptions for a user so browser can create a fresh one
app.delete('/api/subscriptions/:userId/all', async (req, res) => {
    const { userId } = req.params;
    try {
        const subsSnap = await db.collection('users').doc(userId).collection('pushSubscriptions').get();
        await Promise.all(subsSnap.docs.map(doc => doc.ref.delete()));
        console.log(`[Reset] Deleted all ${subsSnap.size} subscriptions for user ${userId}`);
        res.json({ message: `Deleted all ${subsSnap.size} subscriptions. Please reload the app to create a fresh one.` });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Admin: wipe ALL push subscriptions for every user in Firestore (used after rotating VAPID keys)
app.delete('/api/admin/subscriptions/all', async (req, res) => {
    const secret = req.headers['x-admin-secret'];
    if (secret !== (process.env.ADMIN_SECRET || 'budgetwise-admin-2024')) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    try {
        const usersSnap = await db.collection('users').get();
        let totalDeleted = 0;
        for (const userDoc of usersSnap.docs) {
            const subsSnap = await userDoc.ref.collection('pushSubscriptions').get();
            await Promise.all(subsSnap.docs.map(d => d.ref.delete()));
            totalDeleted += subsSnap.size;
        }
        console.log(`[Admin] Wiped all push subscriptions across all users. Total: ${totalDeleted}`);
        res.json({ message: `Done. Deleted ${totalDeleted} push subscription(s) across ${usersSnap.size} user(s).` });
    } catch (error) {
        console.error('Admin wipe error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

const PORT = process.env.PORT || 5000;

if (!db) {
    console.error('[Server] Database not initialized. Server will start in degraded mode (API endpoints will fail).');
}

app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
    if (!db) {
        console.warn('!!! REGISTRATION/NOTIFICATION SERVICES WILL NOT WORK UNTIL serviceAccountKey.json IS ADDED !!!');
    }
});

