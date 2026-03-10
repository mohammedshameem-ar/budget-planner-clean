const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
