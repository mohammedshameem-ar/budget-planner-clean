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
    origin: [
        'https://news-9d3d2.web.app',
        'https://news-9d3d2.firebaseapp.com',
        'http://localhost:5173',
        /\.firebaseapp\.com$/,
        /\.web\.app$/
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-secret']
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
const vapidEmail = process.env.VAPID_EMAIL || 'mailto:admin@budgetwise.app';

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
            console.log(`[Push] Updating existing subscription for user: ${userId}`);
            await existing.docs[0].ref.set(data);
        } else {
            console.log(`[Push] Adding new subscription for user: ${userId}`);
            data.createdAt = admin.firestore.FieldValue.serverTimestamp();
            await subsRef.add(data);
        }
        res.status(200).json({ message: 'Subscription saved successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Test Notification Trigger
app.post('/api/test-notification', async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    try {
        const nowJS = new Date();
        const userRef = db.collection('users').doc(userId);
        const subsSnap = await userRef.collection('pushSubscriptions').get();

        if (subsSnap.empty) return res.status(404).json({ error: 'No subscriptions found' });

        // Build the same rich payload as the scheduler
        const userSnap = await userRef.get();
        const uData = userSnap.data() || {};
        const timezone = uData.timezone || 'UTC';
        const todayStr = new Intl.DateTimeFormat('fr-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(nowJS);
        const monthStr = todayStr.substring(0, 7);

        const txSnap = await userRef.collection('transactionDetails').doc('history').collection('userTransactions').get();
        let totalSpentToday = 0;
        let totalSpentMonth = 0;

        txSnap.docs.forEach(d => {
            const data = d.data();
            if (data.type === 'expense') {
                if (data.date === todayStr) totalSpentToday += data.amount || 0;
                if (data.date && data.date.startsWith(monthStr)) totalSpentMonth += data.amount || 0;
            }
        });

        let budgetLimit = 0, income = 0, incomeEnabled = true, budgetEnabled = true;
        let carryOverBalance = 0, balanceContributedToSavings = 0;

        // Fetch settings from standardized subcollection: transactionDetails/config/userSettings/settings
        const settingsDoc = await userRef.collection('transactionDetails').doc('config').collection('userSettings').doc('settings').get();
        if (settingsDoc.exists) {
            const sData = settingsDoc.data();
            budgetLimit = sData.budgetLimit || 0;
            income = sData.income || 0;
            incomeEnabled = sData.incomeEnabled !== false;
            budgetEnabled = sData.budgetEnabled !== false;
            carryOverBalance = sData.carryOverBalance || 0;
            balanceContributedToSavings = sData.balanceContributedToSavings || 0;
        }

        const availableBalance = Number(income || 0) - Number(budgetLimit || 0) - Number(balanceContributedToSavings || 0) + Number(carryOverBalance || 0);
        const remainingBudget = Number(budgetLimit || 0) - Number(totalSpentMonth || 0);

        // Simple Notification Logic (Reverted from 4-case)
        const body = `Today: ₹${Math.max(0, totalSpentToday).toLocaleString('en-IN')}\n` +
                     `Month: ₹${Math.max(0, totalSpentMonth).toLocaleString('en-IN')}\n` +
                     `Remaining: ₹${remainingBudget.toLocaleString('en-IN')}\n` +
                     `Available Balance: ₹${availableBalance.toLocaleString('en-IN')}`;

        const payload = JSON.stringify({
            title: 'BudgetWise Daily Summary',
            body: body,
            tag: `test-${todayStr}`,
            icon: '/logo.svg',
            badge: '/logo.svg',
            data: { url: '/dashboard' },
            timestamp: Date.now()
        });

        // Advanced options for better delivery
        const options = {
            TTL: 3600, // 1 hour
            urgency: 'high'
        };

        const results = [];
        let successCount = 0, failureCount = 0;
        const endpoints = [];
        for (const doc of subsSnap.docs) {
            const sub = doc.data();
            try {
                console.log(`[Test] Sending to endpoint: ${sub.endpoint.substring(0, 40)}...`);
                await webpush.sendNotification(sub, payload, options);
                results.push({ success: true, endpoint: sub.endpoint });
                endpoints.push(sub.endpoint);
                successCount++;
            } catch (err) {
                console.error(`[Test] Failed for endpoint: ${sub.endpoint.substring(0, 40)}... Error: ${err.message}`);
                if (err.statusCode === 410 || err.statusCode === 404) {
                    console.log(`[Test] Deleting expired/invalid subscription doc: ${doc.id}`);
                    await doc.ref.delete();
                }
                results.push({ success: false, error: err.message, endpoint: sub.endpoint });
                failureCount++;
            }
        }
        console.log(`[Test] Result for user ${userId}: ${successCount} success, ${failureCount} failure`);
        res.json({ results, successCount, failureCount, endpoints });
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
