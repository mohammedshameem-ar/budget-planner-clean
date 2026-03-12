import { createContext, useContext, useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { onMessage } from 'firebase/messaging';
import { auth, db, messaging, googleProvider } from '../firebase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Register push subscription for a user
  const subscribeUserToPush = async (userId, force = false) => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try {
      const registration = await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription();
      
      // If forcing, we explicitly unsubscribe first to get a clean slate
      if (force && subscription) {
        console.log('[Auth] Force re-subscribe: Unsubscribing existing...');
        await subscription.unsubscribe();
        subscription = null;
      }

      if (!subscription) {
        const { getVapidPublicKey, subscribeToPush } = await import('../api/push');
        const publicKey = await getVapidPublicKey();
        
        console.log('[Auth] Creating fresh push subscription for user:', userId);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: publicKey
        });
        await subscribeToPush(subscription.toJSON(), userId);
      } else {
        console.log('[Auth] Reusing existing push subscription for user:', userId);
        const { subscribeToPush } = await import('../api/push');
        await subscribeToPush(subscription.toJSON(), userId);
      }
      console.log('[Auth] Push subscription sent to backend for user:', userId);
    } catch (error) {
      console.error('[Auth] Error subscribing to push for user:', userId, error);
    }
  };

  // Called on every login — ensures push subscription is stored and
  // user's Firestore root doc has timezone + notification defaults
  // so the scheduler can find ALL users, not just the one who saved Settings.
  const ensureUserSetup = async (userId) => {
    try {
      // 1. Register push subscription
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') await subscribeUserToPush(userId);
      } else if (Notification.permission === 'granted') {
        await subscribeUserToPush(userId);
      }

      // 2. Initialize user root doc with timezone if missing
      //    The scheduler reads notificationsEnabled, reminderTime, timezone from here.
      //    We only fill defaults if the doc doesn't already have reminderTime set
      //    so we don't overwrite what the user chose in Settings.
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists() ? userSnap.data() : {};

      // Only set fields that are missing — don't overwrite user's saved settings
      const updates = {};

      // Fallback/Sync from legacy dailyReminder object if root fields are missing
      const legacy = userData.dailyReminder || {};

      if (!userData.timezone) updates.timezone = timezone || legacy.timezone || 'UTC';

      if (userData.notificationsEnabled === undefined) {
        // If root is missing, check or legacy, else default to true
        updates.notificationsEnabled = legacy.enabled !== undefined ? legacy.enabled : true;
      }

      if (!userData.reminderTime) {
        updates.reminderTime = legacy.time || '20:00';
      }

      if (Object.keys(updates).length > 0) {
        await setDoc(userRef, updates, { merge: true });
        console.log('[Auth] Initialized/Synced user doc fields for:', userId, updates);
      }
    } catch (err) {
      console.error('[Auth] ensureUserSetup error:', err);
    }
  };

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log('onAuthStateChanged - Firebase user:', firebaseUser?.email);
      if (firebaseUser) {
        setUser({
          id: firebaseUser.uid,
          name: firebaseUser.displayName || 'User',
          email: firebaseUser.email
        });
        // Ensure push subscription + Firestore user doc is set up for this user
        ensureUserSetup(firebaseUser.uid);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Handle foreground messages
    let messageUnsubscribe;
    if (messaging) {
      messageUnsubscribe = onMessage(messaging, (payload) => {
        console.log('Foreground message received:', payload);
        // show custom toast or browser notification
        new Notification(payload.notification.title, {
          body: payload.notification.body,
        });
      });
    }

    return () => {
      unsubscribe();
      if (messageUnsubscribe) messageUnsubscribe();
    };
  }, []);

  const signUp = async (email, password, name) => {
    console.log('signUp action started for:', email);
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    console.log('Auth user created, updating displayName...');
    await updateProfile(firebaseUser, {
      displayName: name
    });

    console.log('Initializing Firestore profile...');
    const profileRef = doc(db, 'users', firebaseUser.uid, 'transactionDetails', 'settings');
    await setDoc(profileRef, {
      budgetLimit: 0,
      income: 0,
      createdAt: Timestamp.now(),
      email: email,
      name: name
    });

    console.log('Signup complete, manually updating state');
    setUser({
      id: firebaseUser.uid,
      name: name,
      email: firebaseUser.email
    });
  };

  const signIn = async (email, password) => {
    console.log('signIn action started for:', email);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    console.log('SignIn successful, manually updating state');
    setUser({
      id: firebaseUser.uid,
      name: firebaseUser.displayName || 'User',
      email: firebaseUser.email
    });

    // Ensure push subscription + Firestore user doc initialized for this user
    ensureUserSetup(firebaseUser.uid);
  };

  const logout = async () => {
    console.log('logout action started');
    await firebaseSignOut(auth);
    setUser(null);
  };

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;

      // Check if profile exists, if not initialize it
      const profileRef = doc(db, 'users', firebaseUser.uid, 'transactionDetails', 'settings');
      const profileSnap = await getDoc(profileRef);

      if (!profileSnap.exists()) {
        await setDoc(profileRef, {
          budgetLimit: 0,
          income: 0,
          createdAt: Timestamp.now(),
          email: firebaseUser.email,
          name: firebaseUser.displayName || 'User'
        });
      }

      setUser({
        id: firebaseUser.uid,
        name: firebaseUser.displayName || 'User',
        email: firebaseUser.email
      });

      // Ensure push subscription + Firestore user doc initialized for this user
      ensureUserSetup(firebaseUser.uid);
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  if (loading) {
    return <div className="flex-center" style={{ height: '100vh' }}>Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, signUp, signIn, logout, signInWithGoogle, googleSignIn: signInWithGoogle, loading, subscribeUserToPush }}>
      {children}
    </AuthContext.Provider>
  );
};
