const API_URL = import.meta.env.VITE_API_URL || 'https://budget-planner-clean.onrender.com/api';

export const getVapidPublicKey = async () => {
    try {
        const response = await fetch(`${API_URL}/vapid-public-key`, { cache: 'no-store' });
        if (!response.ok) throw new Error('Failed to fetch VAPID key');
        const data = await response.json();
        return data.publicKey;
    } catch (error) {
        console.error('Error fetching VAPID key:', error);
        // Fallback to hardcoded key if backend is unreachable
        return 'BN2C6tcs6OyhPqvI8bZzsn2d-SsicZDOhjf4lAUSR4mlJIfcKv9JKqq19UFjdBNMwseDrC_UOq9k1taqHo3pmmI';
    }
};

export const subscribeToPush = async (subscription, userId) => {
    try {
        const response = await fetch(`${API_URL}/subscribe`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ subscription, userId }),
        });
        if (!response.ok) {
            throw new Error('Failed to subscribe');
        }
        return await response.json();
    } catch (error) {
        console.error('Error subscribing to push:', error);
        throw error;
    }
};

export const sendTestNotification = async (userId) => {
    try {
        const response = await fetch(`${API_URL}/test-notification`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to send test notification');
        }
        return await response.json();
    } catch (error) {
        console.error('Error sending test notification:', error);
        throw error;
    }
};

export const resetPushSubscriptions = async (userId) => {
    try {
        const response = await fetch(`${API_URL}/subscriptions/${userId}/all`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            throw new Error('Failed to reset subscriptions');
        }
        return await response.json();
    } catch (error) {
        console.error('Error resetting subscriptions:', error);
        throw error;
    }
};

export const debugRunScheduler = async () => {
    try {
        const response = await fetch(`${API_URL}/debug-run-scheduler`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-secret': 'budgetwise-admin-2024'
            }
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to trigger scheduler');
        }
        return await response.json();
    } catch (error) {
        console.error('Error triggering scheduler:', error);
        throw error;
    }
};
