const admin = require('firebase-admin');

// Comprehensive Debugging for Render Environment
console.log('[Config] Debugging Environment...');
console.log('[Config] FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? 'EXISTS' : 'MISSING');
console.log('[Config] FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? 'EXISTS' : 'MISSING');
console.log('[Config] FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? ('EXISTS (length: ' + process.env.FIREBASE_PRIVATE_KEY.length + ')') : 'MISSING');

let serviceAccount;
try {
    if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_PROJECT_ID) {
        serviceAccount = {
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        };
        console.log('[Config] Built service account object from environment.');
    } else {
        console.log('[Config] Private Key or Project ID missing, attempting to load file...');
        serviceAccount = require('./serviceAccountKey.json');
        console.log('[Config] Successfully loaded serviceAccountKey.json from file.');
    }
} catch (e) {
    console.warn('[Config] Service account source not found (File or Env):', e.message);
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
