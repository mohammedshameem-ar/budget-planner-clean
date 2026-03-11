const API_URL = import.meta.env.VITE_API_URL || 'https://budget-planner-clean-1.onrender.com/api';

export const getVapidPublicKey = async () => {
    try {
        const response = await fetch(`${API_URL}/vapid-public-key`, { cache: 'no-store' });
        if (!response.ok) throw new Error('Failed to fetch VAPID key');
        const data = await response.json();
        return data.publicKey;
    } catch (error) {
        console.error('Error fetching VAPID key:', error);
        // Fallback to hardcoded key if backend is unreachable
        return 'BHzkrEBTFz7BYesVUVnnymS-INpyRibtu7r3rlWURmDim2BcjtDBdna4-cXXpiBQv1xlerGT83jp_VqOQ6glE5M';
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
