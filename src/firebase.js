// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging } from 'firebase/messaging';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDI1FYcK64boB-ClbfFeuJmzab-94wnl3s",
    authDomain: "news-9d3d2.firebaseapp.com",
    databaseURL: "https://news-9d3d2-default-rtdb.firebaseio.com",
    projectId: "news-9d3d2",
    storageBucket: "news-9d3d2.firebasestorage.app",
    messagingSenderId: "902407030535",
    appId: "1:902407030535:web:cbb9c9a7fe5c745f4d27a2",
    measurementId: "G-Z5ZMX815QG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Firebase Messaging safely
let messaging;
try {
    messaging = getMessaging(app);
} catch (e) {
    // Only warn if not in a environment where messaging would be expected but failed
    // console.log('Firebase Messaging not supported');
    messaging = null;
}

export { messaging };

// Google Auth Provider - always show account picker
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export default app;
