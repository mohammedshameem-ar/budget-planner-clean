const admin = require('firebase-admin');

// Initialize Firebase Admin
// Use environment variables for deployment (Option 2)
let serviceAccount;
try {
    if (process.env.FIREBASE_PRIVATE_KEY) {
        serviceAccount = {
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        };
    } else {
        serviceAccount = require('./serviceAccountKey.json');
    }
} catch (e) {
    console.warn('[Config] Service account key not found, expecting environment variables.');
}

if (serviceAccount || process.env.FIREBASE_PRIVATE_KEY) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('[Config] Firebase Admin initialized successfully.');
    } catch (err) {
        console.error('[Config] Firebase initialization failed:', err.message);
    }
} else {
    console.error('****************************************************************');
    console.error('FATAL ERROR: Firebase Service Account Key not found!');
    console.error('Please place serviceAccountKey.json in the server/ directory.');
    console.error('Or set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.');
    console.error('****************************************************************');
}

const db = admin.apps.length > 0 ? admin.firestore() : null;

module.exports = {
    db,
    admin
};
