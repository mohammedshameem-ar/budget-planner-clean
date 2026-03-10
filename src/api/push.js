const API_URL = import.meta.env.VITE_API_URL || 'https://budget-planner-clean-1.onrender.com/api';

export const getVapidPublicKey = async () => {
    try {
        const response = await fetch(`${API_URL}/vapid-public-key`);
        if (!response.ok) throw new Error('Failed to fetch VAPID key');
        const data = await response.json();
        return data.publicKey;
    } catch (error) {
        console.error('Error fetching VAPID key:', error);
        // Fallback to hardcoded key if backend is unreachable
        return 'BKBTBHQ3gY41vwxe5d5BAqEAGhMOrt9KKYO41-t8BW9gVWPOfH8WDnY0SVsx9hR03njGyiUeJ9DtgibOK8rZD5o';
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
