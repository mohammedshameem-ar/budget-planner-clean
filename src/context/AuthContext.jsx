import { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
import LoadingScreen from '../components/LoadingScreen';
import { auth, db, messaging, googleProvider } from '../firebase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // Notification permission state — exposed so Settings UI can react
  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  // Request notification permission explicitly (called from Settings)
  const requestNotificationPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return 'unsupported';
    try {
      const result = await Notification.requestPermission();
      setNotifPermission(result);
      return result;
    } catch (err) {
      console.error('[Auth] requestPermission error:', err);
      return 'denied';
    }
  }, []);

  // Register push subscription for a user
  const subscribeUserToPush = useCallback(async (userId, force = false) => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('[Auth] Push not supported in this environment');
      return;
    }
    try {
      const registration = await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription();

      // If forcing, explicitly unsubscribe first to get clean keys
      if (force) {
        console.log('[Auth] Force re-subscribe: Cleaning up all existing subscriptions...');
        const { resetPushSubscriptions } = await import('../api/push');
        
        // 1. Unsubscribe local SW if possible
        if (subscription) {
            await subscription.unsubscribe();
            subscription = null;
        }

        // 2. Wipe the backend collection for this user to ensure NO stale tokens remain
        await resetPushSubscriptions(userId).catch(e => console.error('[Auth] Failed to wipe backend subs:', e));
      }

      const { getVapidPublicKey, subscribeToPush } = await import('../api/push');

      if (!subscription) {
        const publicKey = await getVapidPublicKey();
        console.log('[Auth] Creating fresh push subscription for user:', userId);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: publicKey
        });
      }

      await subscribeToPush(subscription.toJSON(), userId);
      console.log('[Auth] Push subscription sent to backend for user:', userId);
    } catch (error) {
      if (error.name === 'NotAllowedError') {
        console.warn('[Auth] Push permission denied by user — cannot subscribe.');
        setNotifPermission('denied');
      } else {
        console.error('[Auth] Error subscribing to push for user:', userId, error);
      }
    }
  }, []);

  // Called on every login — ensures push subscription is stored and user doc is initialized
  const ensureUserSetup = useCallback(async (userId) => {
    try {
      // 1. Register push subscription if permission is already granted or prompt for it
      const currentPermission = typeof Notification !== 'undefined' ? Notification.permission : 'default';
      if (currentPermission === 'default') {
        const permission = await Notification.requestPermission();
        setNotifPermission(permission);
        if (permission === 'granted') await subscribeUserToPush(userId);
      } else if (currentPermission === 'granted') {
        setNotifPermission('granted');
        await subscribeUserToPush(userId);
      } else {
        setNotifPermission(currentPermission);
      }

      // 2. Initialize user root Firestore doc with timezone + notification defaults
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists() ? userSnap.data() : {};
      const legacy = userData.dailyReminder || {};
      const updates = {};

      if (!userData.timezone) updates.timezone = timezone || legacy.timezone || 'UTC';
      if (userData.notificationsEnabled === undefined) {
        updates.notificationsEnabled = legacy.enabled !== undefined ? legacy.enabled : true;
      }
      if (!userData.reminderTime) {
        updates.reminderTime = legacy.time || '20:00';
      }

      if (Object.keys(updates).length > 0) {
        await setDoc(userRef, updates, { merge: true });
        console.log('[Auth] Initialized user doc fields for:', userId, updates);
      }
    } catch (err) {
      console.error('[Auth] ensureUserSetup error:', err);
    }
  }, [subscribeUserToPush]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log('onAuthStateChanged - Firebase user:', firebaseUser?.email);
      if (firebaseUser) {
        setUser({
          id: firebaseUser.uid,
          name: firebaseUser.displayName || 'User',
          email: firebaseUser.email
        });
        ensureUserSetup(firebaseUser.uid);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Handle foreground push messages (when the app IS open)
    // We show a custom in-app banner — NOT a system alert popup
    let messageUnsubscribe;
    if (messaging) {
      messageUnsubscribe = onMessage(messaging, (payload) => {
        console.log('[Auth] FCM foreground message received:', payload);
        // Dispatch a custom DOM event so any component can show an in-app banner
        window.dispatchEvent(new CustomEvent('budgetwise-push', { detail: payload }));
      });
    }

    // Handle pushsubscriptionchange from SW (re-register new subscription with userId)
    const handleSWMessage = async (event) => {
      if (!event.data) return;

      if (event.data.type === 'PUSH_SUBSCRIPTION_CHANGED') {
        console.log('[Auth] SW signalled push subscription changed — re-registering...');
        // Get current user id from state (async workaround: read from auth directly)
        const currentUser = auth.currentUser;
        if (currentUser && event.data.newSubscription) {
          try {
            const { subscribeToPush } = await import('../api/push');
            await subscribeToPush(event.data.newSubscription, currentUser.uid);
            console.log('[Auth] Re-registered rotated subscription for user:', currentUser.uid);
          } catch (err) {
            console.error('[Auth] Failed to re-register rotated subscription:', err);
          }
        }
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
    }

    return () => {
      unsubscribe();
      if (messageUnsubscribe) messageUnsubscribe();
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      }
    };
  }, [ensureUserSetup]);

  const signUp = async (email, password, name) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    await updateProfile(firebaseUser, { displayName: name });
    const profileRef = doc(db, 'users', firebaseUser.uid, 'transactionDetails', 'config', 'userSettings', 'settings');
    await setDoc(profileRef, {
      budgetLimit: 0,
      income: 0,
      createdAt: Timestamp.now(),
      email,
      name
    });
    setUser({ id: firebaseUser.uid, name, email: firebaseUser.email });
  };

  const signIn = async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    setUser({
      id: firebaseUser.uid,
      name: firebaseUser.displayName || 'User',
      email: firebaseUser.email
    });
    ensureUserSetup(firebaseUser.uid);
  };

  const logout = async () => {
    await firebaseSignOut(auth);
    setUser(null);
  };

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      const profileRef = doc(db, 'users', firebaseUser.uid, 'transactionDetails', 'config', 'userSettings', 'settings');
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
      ensureUserSetup(firebaseUser.uid);
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      signUp,
      signIn,
      logout,
      signInWithGoogle,
      googleSignIn: signInWithGoogle,
      loading,
      notifPermission,
      subscribeUserToPush,
      requestNotificationPermission
    }}>
      {loading ? (
        <LoadingScreen message="PREPARING YOUR PERSONAL BUDGET..." />
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};
