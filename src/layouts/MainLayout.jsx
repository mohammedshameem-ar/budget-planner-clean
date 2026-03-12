import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { useBudget } from '../context/BudgetContext';
import { Menu, X, Plus } from 'lucide-react';
import Logo from '../components/Logo';

const MainLayout = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { user } = useAuth();
    const { reminders, getSummary, db } = useBudget();

    // Global Notification Checker
    useEffect(() => {
        if (!user || !db || Notification.permission !== 'granted') return;

        const checkNow = async () => {
            console.log('[NotificationChecker] Running check...');
            try {
                const { doc, getDoc, setDoc, Timestamp } = await import('firebase/firestore');
                if (!db || !user?.id) return;

                const profileRef = doc(db, 'users', user.id, 'transactionDetails', 'settings');
                const profileSnap = await getDoc(profileRef);

                if (!profileSnap.exists()) {
                    console.log('[NotificationChecker] Settings not found in Firestore');
                    return;
                }
                const settings = profileSnap.data();

                // Check if app-level notifications are blocked
                if (settings.appNotificationsStatus === 'denied') {
                    console.log('[NotificationChecker] Notifications disabled in app settings');
                    return;
                }

                const now = new Date();
                const currentTime = now.toTimeString().slice(0, 5); // HH:MM
                const currentDay = now.toISOString().split('T')[0];
                console.log(`[NotificationChecker] Time: ${currentTime}, Date: ${currentDay}`);

                // 1. Handlers for Custom Reminders
                for (const reminder of reminders) {
                    if (reminder.completed) continue; // Skip already completed one-time reminders
                    if (!reminder.active && reminder.active !== undefined) continue; // Default to active if missing

                    if (reminder.completed) continue;
                    if (!reminder.active && reminder.active !== undefined) continue;

                    // Create a full Date object for the scheduled time
                    const [h, m] = reminder.time.split(':');
                    const scheduledDate = new Date(`${reminder.date}T${h}:${m}:00`);
                    const diffMs = now.getTime() - scheduledDate.getTime();
                    const isPastDue = diffMs >= 0;
                    const isRecentlyPast = diffMs >= 0 && diffMs < 5 * 60 * 1000; // Within last 5 mins

                    const isTimeMatch = reminder.time === currentTime;
                    const notYetNotified = reminder.lastNotifiedMinute !== currentTime;

                    console.log(`[NotificationChecker] Checking: ${reminder.notes}`, { isPastDue, isRecentlyPast, recurrence: reminder.recurrence });

                    let shouldTrigger = false;
                    let shouldMarkComplete = false;

                    if (reminder.recurrence === 'one-time') {
                        if (isPastDue) {
                            shouldMarkComplete = true;
                            // Trigger notification only if it's the exact minute OR we missed it very recently
                            if ((isTimeMatch || isRecentlyPast) && !reminder.lastNotifiedMinute) {
                                shouldTrigger = true;
                            }
                        }
                    } else if (reminder.recurrence === 'daily') {
                        if (isTimeMatch && notYetNotified) {
                            shouldTrigger = true;
                        }
                    }
                    // TODO: Implement catch-up logic for weekly and monthly reminders

                    if (shouldTrigger || shouldMarkComplete) {
                        if (shouldTrigger) {
                            const summary = getSummary();
                            new Notification("Budget Reminder", {
                                body: `${reminder.notes ? reminder.notes + '\n\n' : ''}Status: ₹${summary.currentMonthExpenses.toFixed(2)} spent | ₹${summary.remainingBudget.toFixed(2)} available.`,
                                icon: '/logo.png',
                                tag: `reminder-${reminder.id}`,
                                renotify: true
                            });
                        }

                        // Update Firestore
                        const ref = doc(db, 'users', user.id, 'transactionDetails', 'reminders', 'userReminders', reminder.id);
                        const updateData = {
                            updatedAt: Timestamp.now()
                        };

                        if (shouldTrigger) {
                            updateData.lastNotifiedMinute = currentTime;
                        }

                        if (shouldMarkComplete) {
                            console.log(`[NotificationChecker] Auto-completing past-due reminder: ${reminder.id}`);
                            updateData.completed = true;
                        }

                        await setDoc(ref, updateData, { merge: true });
                    }
                }

                // 2. Daily Summary Trigger
                const summaryTime = settings.dailySummaryTime || "09:00";
                const summaryEnabled = settings.dailySummaryEnabled;
                const alreadyNotifiedToday = settings.lastSummaryDate === currentDay;

                console.log('[NotificationChecker] Daily Summary Check:', { summaryTime, summaryEnabled, alreadyNotifiedToday, currentTime });

                if (currentTime === summaryTime && !alreadyNotifiedToday && summaryEnabled) {
                    console.log('[NotificationChecker] Triggering Daily Summary!');
                    const summary = getSummary();
                    new Notification("Daily Financial Summary", {
                        body: `Monthly Spent: ₹${summary.currentMonthExpenses.toFixed(2)}\nAvailable Balance: ₹${summary.remainingBudget.toFixed(2)}`,
                        icon: '/logo.png',
                        badge: '/logo.png',
                        tag: 'daily-summary'
                    });

                    await setDoc(profileRef, {
                        lastSummaryDate: currentDay,
                        updatedAt: Timestamp.now()
                    }, { merge: true });
                }
                console.log('[NotificationChecker] Logged heartbeat at', new Date().toLocaleTimeString());
            } catch (err) {
                console.error('[NotificationChecker] Error:', err);
            }
        };

        const interval = setInterval(checkNow, 60000); // Poll every 60 seconds
        return () => clearInterval(interval);
    }, [user, reminders, getSummary, db]);

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
    const closeSidebar = () => setSidebarOpen(false);

    return (
        <div className="layout-wrapper">
            {/* Ambient Background Blobs */}
            <div className="ambient-blob" style={{ top: '-10%', left: '-10%', background: 'var(--primary)' }}></div>
            <div className="ambient-blob" style={{ bottom: '-10%', right: '-5%', background: 'var(--secondary)' }}></div>
            <div className="ambient-blob" style={{ top: '40%', right: '15%', background: 'var(--accent)', opacity: '0.08' }}></div>

            {/* Mobile Header */}
            <header className="mobile-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Logo size={28} iconOnly={true} />
                    <span className="text-gradient" style={{ fontWeight: '800', fontSize: '1.25rem', letterSpacing: '-0.5px' }}>BudgetWise</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                        onClick={() => window.dispatchEvent(new CustomEvent('open-transaction-modal'))}
                        className="btn btn-primary"
                        style={{ padding: '0.4rem', borderRadius: '50%' }}
                    >
                        <Plus size={20} />
                    </button>
                    <button onClick={toggleSidebar} style={{ color: 'var(--text-main)', padding: '0.4rem' }}>
                        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </header>

            <div className="layout-main-content">
                {/* Mobile Overlay */}
                {sidebarOpen && <div className="mobile-overlay" onClick={closeSidebar}></div>}

                <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

                <main className="main-area">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
