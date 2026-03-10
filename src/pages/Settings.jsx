import { useState, useEffect } from 'react';
import { useBudget } from '../context/BudgetContext';
import { useAuth } from '../context/AuthContext';
import { Save, RefreshCw, AlertCircle, Bell, Download, Activity, Shield, ChevronUp, ChevronDown, Check, X, Edit2 } from 'lucide-react';
import Modal from '../components/Modal';
import { collection, doc, getDocs, deleteDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

const Settings = () => {
    const { user, subscribeUserToPush } = useAuth();
    const { budgetLimit, updateBudgetLimit, income, updateIncome, incomeEnabled, updateIncomeEnabled, clearTransactions, clearAllData, getSummary, reminders, addReminder, deleteReminder } = useBudget();
    const [budgetInput, setBudgetInput] = useState(budgetLimit);
    const [incomeInput, setIncomeInput] = useState(income);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // PWA & Notification State
    const [isInstalled, setIsInstalled] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [notificationPermission, setNotificationPermission] = useState(Notification.permission);
    const [swActive, setSwActive] = useState(false);

    // Modal State
    const [showIncomeModal, setShowIncomeModal] = useState(false);
    const [showBudgetModal, setShowBudgetModal] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);

    // Reminder Form State
    const [reminderDate, setReminderDate] = useState(new Date().toISOString().split('T')[0]);
    const [reminderTime, setReminderTime] = useState('09:00');
    const [reminderRecurrence, setReminderRecurrence] = useState('one-time');
    const [reminderNotes, setReminderNotes] = useState('');

    // Reminder State
    const [remindersCollapsed, setRemindersCollapsed] = useState(true);
    const [pendingReminder, setPendingReminder] = useState(null);
    const [showReminderConfirm, setShowReminderConfirm] = useState(false);

    // Daily Budget Summary State
    const [budgetSummaryEnabled, setBudgetSummaryEnabled] = useState(false);
    const [budgetSummaryTime, setBudgetSummaryTime] = useState('20:00');
    const [summaryCompact, setSummaryCompact] = useState(false);

    // Load budget summary settings from local storage on mount
    useEffect(() => {
        const savedSettings = JSON.parse(localStorage.getItem('budget_settings') || '{}');
        if (savedSettings.budgetSummary) {
            setBudgetSummaryEnabled(savedSettings.budgetSummary.enabled);
            setBudgetSummaryTime(savedSettings.budgetSummary.time);
            setSummaryCompact(savedSettings.budgetSummary.compact || false);
        }

        // Check if SW is active
        const checkSW = async () => {
            if ('serviceWorker' in navigator) {
                try {
                    const registration = await navigator.serviceWorker.ready;
                    setSwActive(!!registration?.active);
                    setNotificationPermission(Notification.permission);
                } catch (e) {
                    console.error('Error checking SW:', e);
                    setSwActive(false);
                }
            }
        };

        // Check if app is installed (standalone)
        const checkInstallation = () => {
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
            setIsInstalled(!!isStandalone);
        };

        checkSW();
        checkInstallation();

        // Listen for controllerchange to update SW status
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                setSwActive(true);
            });
        }
    }, []);

    // Add reminder handler (shows confirmation first)
    const handleAddReminder = async () => {
        if (!reminderTime || !reminderDate) return;

        // Validation for past dates/times (specifically for one-time)
        if (reminderRecurrence === 'one-time') {
            const selectedDateTime = new Date(`${reminderDate}T${reminderTime}`);
            const now = new Date();

            if (selectedDateTime < now) {
                setError('You cannot set a reminder in the past. Please select a future date and time.');
                setTimeout(() => setError(''), 3000); // Clear error after 3s
                return;
            }
        }

        setPendingReminder({
            date: reminderDate,
            time: reminderTime,
            recurrence: reminderRecurrence,
            notes: reminderNotes || 'Reminder notification',
            enabled: true
        });
        setShowReminderConfirm(true);
    };

    const confirmReminder = async () => {
        if (!pendingReminder) return;
        try {
            await addReminder(pendingReminder);
            // Reset form
            setReminderDate(new Date().toISOString().split('T')[0]);
            setReminderTime('09:00');
            setReminderRecurrence('one-time');
            setReminderNotes('');
            setPendingReminder(null);
            setShowReminderConfirm(false);
        } catch (error) {
            console.error('Error adding reminder:', error);
        }
    };

    const cancelReminder = () => {
        setPendingReminder(null);
        setShowReminderConfirm(false);
    };

    const handleSaveBudgetSummary = async () => {
        const settings = JSON.parse(localStorage.getItem('budget_settings') || '{}');
        settings.budgetSummary = {
            enabled: budgetSummaryEnabled,
            time: budgetSummaryTime,
            compact: true
        };
        localStorage.setItem('budget_settings', JSON.stringify(settings));
        setSummaryCompact(true);

        // Sync to Firestore for the backend scheduler
        if (user) {
            try {
                const userRef = doc(db, 'users', user.id);
                // Also capture the user's timezone so backend cron can run correctly
                const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                await setDoc(userRef, {
                    notificationsEnabled: budgetSummaryEnabled,
                    reminderTime: budgetSummaryTime,
                    timezone: timezone || 'UTC',
                    reminderUpdatedAt: Timestamp.now(),
                    dailyReminderLastSentDate: null
                }, { merge: true });
            } catch (error) {
                console.error('Error syncing budget summary to Firestore:', error);
            }
        }
    };

    const toggleRemindersCollapse = () => {
        const newState = !remindersCollapsed;
        setRemindersCollapsed(newState);
        localStorage.setItem('reminders_collapsed', JSON.stringify(newState));
    };

    // Sync when budget data changes (for the summary notification) - only if enabled
    /* 
       Backend Scheduler will handle this in future updates. 
       For now, we just save settings to localStorage/Firestore so backend can read it later.
    */

    // Listen for PWA install prompt
    useEffect(() => {
        const handler = (e) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);

        // We've used the prompt, and can't use it again, throw it away
        setDeferredPrompt(null);
    };

    const handleTestNotification = async () => {
        if (!user) {
            alert('Please log in to test notifications.');
            return;
        }
        try {
            console.log('Starting notification test...');
            const { sendTestNotification } = await import('../api/push');
            const result = await sendTestNotification(user.id);
            alert(`✅ Test result: Sent to ${result.successCount} device(s). Failed on ${result.failureCount}.`);
        } catch (e) {
            console.error('Test failed:', e);

            // Check if the backend server is not running
            if (e.message && (e.message.includes('Failed to fetch') || e.message.includes('fetch'))) {
                const API_BASE = import.meta.env.VITE_API_URL || 'https://budget-planner-clean-1.onrender.com/api';
                alert(`❌ Cannot reach backend server at: ${API_BASE}\n\nPlease check if your Render backend is running and that your VITE_API_URL is correctly configured.`);
                return;
            }

            if (e.message && e.message.includes('No subscriptions')) {
                const retry = window.confirm('No subscription found on server. Attempt to subscribe now?');
                if (retry) {
                    try {
                        alert('Please wait, subscribing...');
                        await subscribeUserToPush(user.id);
                        alert('Subscription attempt finished. Please try "Test Notification" again.');
                    } catch (subError) {
                        alert('Subscription failed: ' + subError.message);
                    }
                }
            } else {
                alert(`Error during test: ${e.message}`);
            }
        }
    };

    const handleOpenBudgetModal = () => {
        setBudgetInput(budgetLimit);
        setShowBudgetModal(true);
        setError('');
    };

    const handleSaveIncome = async () => {
        if (!incomeInput || parseFloat(incomeInput) <= 0) {
            setError('Please enter a valid income amount.');
            return;
        }
        setLoading(true);
        try {
            await updateIncome(parseFloat(incomeInput));
            setShowIncomeModal(false);
            setError('');
        } catch (err) {
            setError('Failed to update income.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveBudget = async () => {
        if (!budgetInput || parseFloat(budgetInput) <= 0) {
            setError('Please enter a valid budget amount.');
            return;
        }

        if (incomeEnabled && parseFloat(budgetInput) > income) {
            setError(`Budget limit cannot exceed your monthly income (₹${income.toLocaleString()}).`);
            return;
        }

        setLoading(true);
        try {
            await updateBudgetLimit(parseFloat(budgetInput));
            setShowBudgetModal(false);
            setError('');
        } catch (err) {
            setError('Failed to update budget limit.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleResetTransactions = async () => {
        if (!window.confirm('Are you sure you want to delete all transactions? This cannot be undone.')) return;
        setLoading(true);
        try {
            await clearTransactions();
            setShowResetModal(false);
            alert('Transactions cleared successfully.');
        } catch (err) {
            console.error(err);
            alert('Failed to clear transactions.');
        } finally {
            setLoading(false);
        }
    };

    const handleResetAll = async () => {
        if (!window.confirm('WARNING: This will delete ALL data including account settings. Are you sure?')) return;
        setLoading(true);
        try {
            await clearAllData();
            setShowResetModal(false);
            alert('All data reset successfully.');
        } catch (err) {
            console.error(err);
            alert('Failed to reset data.');
        } finally {
            setLoading(false);
        }
    };

    const isBudgetDisabled = incomeEnabled && income <= 0;

    return (
        <div className="container animate-fade-in">
            <header className="flex-between" style={{ marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 className="text-gradient">Settings</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Manage your preferences</p>
                </div>
                {deferredPrompt && (
                    <button
                        onClick={handleInstallClick}
                        className="btn btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <Download size={18} />
                        Install App
                    </button>
                )}
            </header>

            {/* Settings Grid Container */}
            <div className="settings-grid">
                {/* Income Settings Section */}
                <div className="glass-panel">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                        <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Income Settings</h2>
                        <button
                            onClick={() => updateIncomeEnabled(!incomeEnabled)}
                            className="btn"
                            style={{
                                padding: '0.35rem 1rem',
                                fontSize: '0.82rem',
                                fontWeight: '700',
                                borderRadius: '20px',
                                background: incomeEnabled
                                    ? 'rgba(239, 68, 68, 0.12)'
                                    : 'rgba(16, 185, 129, 0.12)',
                                color: incomeEnabled ? 'var(--danger)' : 'var(--success)',
                                border: `1.5px solid ${incomeEnabled ? 'var(--danger)' : 'var(--success)'}`,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {incomeEnabled ? '🔴 Disable Income' : '🟢 Enable Income'}
                        </button>
                    </div>

                    {/* Info banner shown when income is disabled */}
                    {!incomeEnabled && (
                        <div className="animate-fade-in" style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.6rem',
                            marginBottom: '1rem',
                            padding: '0.75rem 1rem',
                            background: 'rgba(251, 191, 36, 0.1)',
                            border: '1px solid rgba(251, 191, 36, 0.4)',
                            borderRadius: '10px',
                            fontSize: '0.85rem',
                            color: '#d97706'
                        }}>
                            <span style={{ fontSize: '1rem', flexShrink: 0 }}>ℹ️</span>
                            <span>Income tracking is <strong>disabled</strong>. The Dashboard will show <strong>None</strong> for Total Income and Available Balance. Enable it to set and track your monthly income.</span>
                        </div>
                    )}

                    <div style={{ marginBottom: '1rem', opacity: incomeEnabled ? 1 : 0.4, pointerEvents: incomeEnabled ? 'auto' : 'none', transition: 'opacity 0.3s ease' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                            Monthly Income (₹)
                        </label>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                            Current Income: <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>₹{income.toLocaleString()}</span>
                        </p>
                        <button onClick={() => setShowIncomeModal(true)} className="btn btn-primary" disabled={!incomeEnabled}>
                            Set Monthly Income
                        </button>
                    </div>
                </div>

                {/* Budget Settings Section */}
                <div className="glass-panel">
                    <h2 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', fontSize: '1.25rem' }}>
                        Budget Preferences
                    </h2>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                            Monthly Budget Limit (₹)
                        </label>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                            Current Limit: <span style={{ color: 'var(--text-main)', fontWeight: 'bold' }}>₹{budgetLimit.toLocaleString()}</span>
                        </p>

                        {isBudgetDisabled && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                marginBottom: '1rem',
                                padding: '0.75rem',
                                background: 'rgba(239, 68, 68, 0.1)',
                                borderRadius: '8px',
                                color: 'var(--danger)',
                                fontSize: '0.875rem'
                            }}>
                                <AlertCircle size={16} />
                                Please set your income before setting a budget limit.
                            </div>
                        )}

                        <button
                            onClick={handleOpenBudgetModal}
                            className="btn btn-primary"
                            disabled={isBudgetDisabled}
                            style={{ opacity: isBudgetDisabled ? 0.5 : 1, cursor: isBudgetDisabled ? 'not-allowed' : 'pointer' }}
                        >
                            Set New Budget
                        </button>
                    </div>
                </div>

                {/* Reminders Section */}
                <div className="glass-panel">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', margin: 0 }}>
                            <Bell size={20} />
                            Reminders
                        </h2>
                        <button onClick={toggleRemindersCollapse} className="btn btn-outline" style={{ padding: '0.25rem', borderRadius: '50%' }}>
                            {remindersCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                        </button>
                    </div>

                    {!remindersCollapsed && (
                        <div className="animate-fade-in">
                            {/* Add Reminder Form */}
                            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>Add New Reminder</h3>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                    {reminderRecurrence === 'one-time' && (
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Date</label>
                                            <input
                                                type="date"
                                                value={reminderDate}
                                                onChange={(e) => setReminderDate(e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    padding: '0.6rem',
                                                    borderRadius: '8px',
                                                    border: '1px solid var(--glass-border)',
                                                    background: 'rgba(255, 255, 255, 0.05)',
                                                    color: 'var(--text-main)',
                                                    fontSize: '0.95rem'
                                                }}
                                            />
                                        </div>
                                    )}
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Time</label>
                                        <input
                                            type="time"
                                            value={reminderTime}
                                            onChange={(e) => setReminderTime(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '0.6rem',
                                                borderRadius: '8px',
                                                border: '1px solid var(--glass-border)',
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                color: 'var(--text-main)',
                                                fontSize: '0.95rem'
                                            }}
                                        />
                                    </div>
                                </div>

                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Recurrence</label>
                                    <select
                                        value={reminderRecurrence}
                                        onChange={(e) => setReminderRecurrence(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '0.6rem',
                                            borderRadius: '8px',
                                            border: '1px solid var(--glass-border)',
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            color: 'var(--text-main)',
                                            fontSize: '0.95rem'
                                        }}
                                    >
                                        <option value="one-time">One-time (Specific Date)</option>
                                        <option value="daily">Every Day (Time only)</option>
                                    </select>
                                </div>

                                {error && (
                                    <div className="animate-fade-in" style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        marginBottom: '1rem',
                                        padding: '0.75rem',
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        borderRadius: '8px',
                                        color: 'var(--danger)',
                                        fontSize: '0.85rem'
                                    }}>
                                        <AlertCircle size={16} />
                                        {error}
                                    </div>
                                )}

                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Notes (Optional)</label>
                                    <input
                                        type="text"
                                        value={reminderNotes}
                                        onChange={(e) => setReminderNotes(e.target.value)}
                                        placeholder="Reminder message..."
                                        style={{
                                            width: '100%',
                                            padding: '0.6rem',
                                            borderRadius: '8px',
                                            border: '1px solid var(--glass-border)',
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            color: 'var(--text-main)',
                                            fontSize: '0.95rem'
                                        }}
                                    />
                                </div>

                                {showReminderConfirm ? (
                                    <div className="animate-fade-in" style={{
                                        background: 'rgba(16, 185, 129, 0.1)',
                                        border: '1px solid var(--success)',
                                        borderRadius: '8px',
                                        padding: '0.75rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.75rem',
                                        alignItems: 'center'
                                    }}>
                                        <span style={{ color: 'var(--success)', fontWeight: '600', fontSize: '0.9rem', textAlign: 'center' }}>
                                            Reminder set successfully. Confirm?
                                        </span>
                                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                                            <button onClick={confirmReminder} className="btn" style={{ background: 'var(--success)', color: 'white', padding: '0.4rem 1.25rem' }}>
                                                <Check size={16} /> OK
                                            </button>
                                            <button onClick={cancelReminder} className="btn btn-outline" style={{ borderColor: 'var(--danger)', color: 'var(--danger)', padding: '0.4rem 1rem' }}>
                                                <X size={16} /> Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleAddReminder}
                                        className="btn btn-primary"
                                        style={{ width: '100%', justifyContent: 'center' }}
                                    >
                                        Add Reminder
                                    </button>
                                )}
                            </div>

                            {/* Reminders List */}
                            <div>
                                <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>Active Reminders</h3>
                                {reminders.length === 0 ? (
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No reminders set yet.</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {reminders.map((reminder) => (
                                            <div
                                                key={reminder.id}
                                                style={{
                                                    padding: '0.75rem',
                                                    background: 'rgba(255,255,255,0.03)',
                                                    borderRadius: '8px',
                                                    border: '1px solid var(--glass-border)',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center'
                                                }}
                                            >
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                                                        <span style={{ fontWeight: '600' }}>{reminder.date}</span>
                                                        <span>{reminder.time}</span>
                                                        <span style={{
                                                            fontSize: '0.7rem',
                                                            padding: '0.1rem 0.4rem',
                                                            background: reminder.completed ? 'var(--success)' : 'var(--primary)',
                                                            borderRadius: '4px',
                                                            textTransform: 'capitalize',
                                                            opacity: reminder.completed ? 0.8 : 1,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.25rem'
                                                        }}>
                                                            {reminder.completed && <Check size={12} strokeWidth={3} />}
                                                            {reminder.completed ? 'Completed' : reminder.recurrence}
                                                        </span>
                                                    </div>
                                                    {reminder.notes && (
                                                        <p style={{
                                                            fontSize: '0.85rem',
                                                            color: 'var(--text-muted)',
                                                            textDecoration: reminder.completed ? 'line-through' : 'none',
                                                            opacity: reminder.completed ? 0.5 : 0.8
                                                        }}>
                                                            {reminder.notes}
                                                        </p>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => deleteReminder(reminder.id)}
                                                    style={{
                                                        padding: '0.4rem 0.75rem',
                                                        background: 'var(--danger)',
                                                        color: 'white',
                                                        borderRadius: '6px',
                                                        fontSize: '0.8rem'
                                                    }}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

            </div>

            {/* Daily Budget Summary */}
            <div className="glass-panel" style={{ marginTop: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '600' }}>Daily Budget Summary</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {summaryCompact && budgetSummaryEnabled && (
                            <button
                                onClick={() => setSummaryCompact(false)}
                                className="btn btn-outline"
                                style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', border: 'none' }}
                            >
                                <Edit2 size={14} /> Edit
                            </button>
                        )}
                        <label className="switch">
                            <input
                                type="checkbox"
                                checked={budgetSummaryEnabled}
                                onChange={(e) => {
                                    setBudgetSummaryEnabled(e.target.checked);
                                    if (!e.target.checked) setSummaryCompact(false);
                                }}
                            />
                            <span className="slider round"></span>
                        </label>
                    </div>
                </div>

                {budgetSummaryEnabled && summaryCompact ? (
                    <div className="animate-fade-in" style={{
                        padding: '0.75rem 1rem',
                        background: 'rgba(16, 185, 129, 0.05)',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Check size={18} style={{ color: 'var(--success)' }} />
                            <span style={{ fontWeight: '500' }}>Daily Budget Summary Added</span>
                        </div>
                        <span style={{
                            background: 'var(--primary)',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '4px',
                            fontSize: '0.85rem',
                            fontWeight: '600'
                        }}>
                            {budgetSummaryTime}
                        </span>
                    </div>
                ) : (
                    <>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                            Receive a daily notification with your budget limit, total expenses, and remaining budget.
                        </p>

                        {budgetSummaryEnabled && (
                            <div className="animate-fade-in" style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Time</label>
                                    <input
                                        type="time"
                                        value={budgetSummaryTime}
                                        onChange={(e) => setBudgetSummaryTime(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '0.6rem',
                                            borderRadius: '8px',
                                            border: '1px solid var(--glass-border)',
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            color: 'var(--text-main)',
                                            fontSize: '0.95rem'
                                        }}
                                    />
                                </div>
                                <button
                                    onClick={handleSaveBudgetSummary}
                                    className="btn btn-primary"
                                    style={{ width: '100%', justifyContent: 'center' }}
                                >
                                    Set Budget Summary
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div >

            <div style={{ marginTop: '2rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Bell size={18} /> Notification Controls
                </h3>

                {/* Force Re-subscribe button */}
                <button
                    onClick={async () => {
                        if (!user) return alert('Please log in first.');
                        try {
                            const API_BASE = import.meta.env.VITE_API_URL || 'https://budget-planner-clean-1.onrender.com/api';
                            // Step 1: Delete all stale subscriptions from server
                            const res = await fetch(`${API_BASE}/subscriptions/${user.id}/all`, { method: 'DELETE' });
                            const data = await res.json();
                            console.log('[ReSubscribe] Server reset:', data);

                            // Step 2: Unsubscribe from browser push manager
                            if ('serviceWorker' in navigator) {
                                const reg = await navigator.serviceWorker.ready;
                                const existing = await reg.pushManager.getSubscription();
                                if (existing) await existing.unsubscribe();
                            }

                            // Step 3: Create fresh subscription
                            await subscribeUserToPush(user.id);
                            alert('✅ Re-subscribed successfully! Try "Test Notification" now.');
                        } catch (err) {
                            console.error('Re-subscribe failed:', err);
                            if (err.message && err.message.includes('fetch')) {
                                 alert(`❌ Backend unreachable at: ${API_BASE}\n\nIf deployed, check your server status and FRONTEND_URL/VITE_API_URL settings.`);
                            } else {
                                alert('Re-subscribe failed: ' + err.message);
                            }
                        }
                    }}
                    className="btn btn-outline"
                    style={{ width: '100%', justifyContent: 'center' }}
                >
                    🔄 Force Re-subscribe (Fix broken notifications)
                </button>

                <button
                    onClick={handleTestNotification}
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center' }}
                >
                    🔔 Test Notification System
                </button>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    If notifications fail: click "Force Re-subscribe" first, then test again.
                </p>
            </div>

            {/* Diagnostics Section */}
            <div className="glass-panel" style={{ marginTop: '2rem' }}>
                <h2 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem' }}>
                    <Activity size={20} />
                    Diagnostics
                </h2>
                <div style={{ display: 'grid', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>App Installed (PWA):</span>
                        <span style={{ color: isInstalled ? 'var(--success)' : 'var(--warning)', fontWeight: 'bold' }}>
                            {isInstalled ? 'Yes' : 'No (Browser/Web)'}
                        </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Notification Permission:</span>
                        <span style={{ color: notificationPermission === 'granted' ? 'var(--success)' : 'var(--danger)', fontWeight: 'bold' }}>
                            {notificationPermission}
                        </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Service Worker Active:</span>
                        <span style={{ color: swActive ? 'var(--success)' : 'var(--danger)', fontWeight: 'bold' }}>
                            {swActive ? 'Yes' : 'No'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Danger Zone Section */}
            <div className="glass-panel" style={{ maxWidth: '600px', margin: '2rem auto 0', borderColor: 'var(--danger)' }}>
                <h2 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', color: 'var(--danger)', fontSize: '1.25rem' }}>
                    <Shield size={20} />
                    Danger Zone
                </h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    Clearing data will remove all your transactions and settings permanently.
                </p>
                <button
                    className="btn btn-outline"
                    style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
                    onClick={() => setShowResetModal(true)}
                >
                    <RefreshCw size={18} />
                    Reset All Data
                </button>
            </div>

            {/* Income Modal */}
















            {
                showIncomeModal && (
                    <Modal title="Set Monthly Income" onClose={() => setShowIncomeModal(false)}>
                        <div>
                            <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
                                Enter your total monthly income.
                            </p>
                            {error && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.75rem',
                                    marginBottom: '1rem',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    borderRadius: '8px',
                                    color: 'var(--danger)',
                                    fontSize: '0.875rem'
                                }}>
                                    <AlertCircle size={16} />
                                    {error}
                                </div>
                            )}
                            <input
                                type="number"
                                step="0.01"
                                value={incomeInput}
                                onChange={(e) => setIncomeInput(e.target.value)}
                                placeholder="e.g. 35000"
                                style={{ marginBottom: '1.5rem' }}
                                autoFocus
                                disabled={loading}
                            />
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                <button onClick={() => setShowIncomeModal(false)} className="btn btn-outline" style={{ border: 'none' }} disabled={loading}>
                                    Cancel
                                </button>
                                <button onClick={handleSaveIncome} className="btn btn-primary" disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </Modal>
                )
            }

            {/* Budget Modal */}
            {
                showBudgetModal && (
                    <Modal title="Set New Budget" onClose={() => setShowBudgetModal(false)}>
                        <div>
                            <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
                                Enter your new monthly budget limit below.
                            </p>
                            {error && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.75rem',
                                    marginBottom: '1rem',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    borderRadius: '8px',
                                    color: 'var(--danger)',
                                    fontSize: '0.875rem'
                                }}>
                                    <AlertCircle size={16} />
                                    {error}
                                </div>
                            )}
                            <input
                                type="number"
                                step="0.01"
                                value={budgetInput}
                                onChange={(e) => setBudgetInput(e.target.value)}
                                placeholder="e.g. 20000"
                                style={{ marginBottom: '1.5rem' }}
                                autoFocus
                                disabled={loading}
                            />
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                <button onClick={() => setShowBudgetModal(false)} className="btn btn-outline" style={{ border: 'none' }} disabled={loading}>
                                    Cancel
                                </button>
                                <button onClick={handleSaveBudget} className="btn btn-primary" disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </Modal>
                )
            }

            {/* Reset Confirmation Modal */}
            {
                showResetModal && (
                    <Modal title="Reset Data" onClose={() => setShowResetModal(false)}>
                        <div>
                            <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
                                Choose what you want to reset:
                            </p>
                            {error && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.75rem',
                                    marginBottom: '1rem',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    borderRadius: '8px',
                                    color: 'var(--danger)',
                                    fontSize: '0.875rem'
                                }}>
                                    <AlertCircle size={16} />
                                    {error}
                                </div>
                            )}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <button
                                    onClick={handleResetTransactions}
                                    className="btn btn-outline"
                                    disabled={loading}
                                    style={{
                                        justifyContent: 'flex-start',
                                        borderColor: 'var(--warning)',
                                        color: 'var(--warning)'
                                    }}
                                >
                                    <RefreshCw size={18} />
                                    {loading ? 'Clearing...' : 'Delete All Transactions (Keep Settings)'}
                                </button>
                                <button
                                    onClick={handleResetAll}
                                    className="btn btn-primary"
                                    disabled={loading}
                                    style={{
                                        justifyContent: 'flex-start',
                                        background: 'var(--danger)'
                                    }}
                                >
                                    <RefreshCw size={18} />
                                    {loading ? 'Clearing...' : 'Delete Everything (Transactions + Settings)'}
                                </button>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                                <button
                                    onClick={() => setShowResetModal(false)}
                                    className="btn btn-outline"
                                    style={{ border: 'none' }}
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </Modal>
                )
            }
        </div>
    );
};

export default Settings;
