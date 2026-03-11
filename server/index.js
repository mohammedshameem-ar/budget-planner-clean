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
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Log all requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

app.use(bodyParser.json());

app.get("/", (req, res) => {
    res.send("Backend is running 🚀");
});

// VAPID Keys
const publicVapidKey = process.env.VAPID_PUBLIC_KEY || 'BHzkrEBTFz7BYesVUVnnymS-INpyRibtu7r3rlWURmDim2BcjtDBdna4-cXXpiBQv1xlerGT83jp_VqOQ6glE5M';
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || 'Nu1ixngRDtZgLxCtNGlQGv3aUsZmwjH3QIRjA8v0jI0';
const vapidEmail = process.env.VAPID_EMAIL || 'mailto:mohammedshameem.ar@gmail.com';

webpush.setVapidDetails(vapidEmail, publicVapidKey, privateVapidKey);

app.get('/api/vapid-public-key', (req, res) => {
    res.json({ publicKey: publicVapidKey });
});

// For external keep-alive services (UptimeRobot, cron-job.org)
app.get('/api/ping', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Store subscription
app.post('/api/subscribe', async (req, res) => {
    const { subscription, userId } = req.body;
    if (!userId || !subscription) return res.status(400).json({ error: 'Missing userId or subscription' });

    try {
        const subData = JSON.parse(JSON.stringify(subscription));
        if (!subData.endpoint || !subData.keys) return res.status(400).json({ error: 'Invalid subscription' });

        const subsRef = db.collection('users').doc(userId).collection('pushSubscriptions');
        const existing = await subsRef.where('endpoint', '==', subData.endpoint).limit(1).get();
        
        const data = {
            ...subData,
            ua: req.get('User-Agent'),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        if (!existing.empty) {
            await existing.docs[0].ref.set(data);
        } else {
            data.createdAt = admin.firestore.FieldValue.serverTimestamp();
            await subsRef.add(data);
        }
        res.status(200).json({ message: 'Subscription saved' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Test Notification Trigger
app.post('/api/test-notification', async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    try {
        const userRef = db.collection('users').doc(userId);
        const subsSnap = await userRef.collection('pushSubscriptions').get();

        if (subsSnap.empty) return res.status(404).json({ error: 'No subscriptions found' });

        const payload = JSON.stringify({
            title: 'BudgetWise Test',
            body: 'Your push notifications are working correctly!',
            icon: '/logo.svg',
            badge: '/logo.svg',
            data: { url: '/settings' }
        });

        const results = [];
        for (const doc of subsSnap.docs) {
            try {
                await webpush.sendNotification(doc.data(), payload);
                results.push({ success: true, endpoint: doc.data().endpoint });
            } catch (err) {
                if (err.statusCode === 410 || err.statusCode === 404) await doc.ref.delete();
                results.push({ success: false, error: err.message });
            }
        }
        res.json({ results });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Manual Scheduler Trigger (for debugging)
app.post('/api/debug-run-scheduler', async (req, res) => {
    const { runScheduler } = require('./scheduler');
    try {
        console.log('[Debug] Manually triggering scheduler...');
        const results = await runScheduler(true);
        res.json({ message: 'Scheduler run complete', details: results });
    } catch (error) {
        console.error('[Debug] Manual scheduler run failed:', error);
        res.status(500).json({ error: error.message });
    }
});

// Cleanup broken subscriptions
app.delete('/api/subscriptions/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const subsSnap = await db.collection('users').doc(userId).collection('pushSubscriptions').get();
        let deleted = 0;
        for (const doc of subsSnap.docs) {
            const data = doc.data();
            if (!data.keys || !data.keys.p256dh || !data.keys.auth) {
                await doc.ref.delete();
                deleted++;
            }
        }
        res.json({ deleted });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Reset ALL subscriptions
app.delete('/api/subscriptions/:userId/all', async (req, res) => {
    const { userId } = req.params;
    try {
        const subsSnap = await db.collection('users').doc(userId).collection('pushSubscriptions').get();
        await Promise.all(subsSnap.docs.map(doc => doc.ref.delete()));
        res.json({ message: 'All subscriptions reset' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Admin wipe
app.delete('/api/admin/subscriptions/all', async (req, res) => {
    const secret = req.headers['x-admin-secret'];
    if (secret !== (process.env.ADMIN_SECRET || 'budgetwise-admin-2024')) return res.status(403).send('Forbidden');
    try {
        const usersSnap = await db.collection('users').get();
        let total = 0;
        for (const userDoc of usersSnap.docs) {
            const subsSnap = await userDoc.ref.collection('pushSubscriptions').get();
            await Promise.all(subsSnap.docs.map(d => d.ref.delete()));
            total += subsSnap.size;
        }
        res.json({ totalDeleted: total });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
