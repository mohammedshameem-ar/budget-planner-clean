import { useState, useEffect, useRef } from 'react';
import { useBudget } from '../context/BudgetContext';
import { useAuth } from '../context/AuthContext';
import { RefreshCw, AlertCircle, Bell, Download, Activity, Shield, ChevronUp, ChevronDown, Check, X, Edit2, Settings as SettingsIcon, Wallet, Sparkles, BellOff, BellRing, Wifi } from 'lucide-react';
import Modal from '../components/Modal';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

const Settings = () => {
    const { user, subscribeUserToPush, notifPermission, requestNotificationPermission } = useAuth();
    const { avatar, updateAvatar, toggleAvatarPicker, transactions, budgetLimit, updateBudgetLimit, income, updateIncome, incomeEnabled, updateIncomeEnabled, budgetEnabled, updateBudgetEnabled, clearTransactions, clearAllData, getSummary, reminders, addReminder, deleteReminder } = useBudget();
    const [budgetInput, setBudgetInput] = useState(budgetLimit);
    const [incomeInput, setIncomeInput] = useState(income);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // PWA & Notification State
    const [isInstalled, setIsInstalled] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [swActive, setSwActive] = useState(false);
    // Inline push toast — shown instead of invasive alert()
    const [pushToast, setPushToast] = useState(null);
    const pushToastTimer = useRef(null);

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
    const [testResult, setTestResult] = useState(null); // { success: boolean, message: string, detail?: string }

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
            navigator.serviceWorker.addEventListener('controllerchange', () => setSwActive(true));
        }

        // Listen for push events broadcast by SW — show inline toast, NOT alert()
        const handleBudgetwisePush = (e) => {
            clearTimeout(pushToastTimer.current);
            const detail = e.detail || {};
            const title = detail?.notification?.title || detail?.title || 'BudgetWise';
            const body = detail?.notification?.body || detail?.body || 'New notification received';
            setPushToast({ title, body });
            pushToastTimer.current = setTimeout(() => setPushToast(null), 6000);
        };
        window.addEventListener('budgetwise-push', handleBudgetwisePush);

        return () => window.removeEventListener('budgetwise-push', handleBudgetwisePush);
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

    // SW message listener: show inline toast for PUSH_RECEIVED (no alert popup)
    useEffect(() => {
        if (!('serviceWorker' in navigator)) return;
        const handleSWMessage = (event) => {
            if (event.data && event.data.type === 'PUSH_RECEIVED') {
                console.log('[Settings] SW push received:', event.data);
                clearTimeout(pushToastTimer.current);
                const p = event.data.payload || {};
                setPushToast({ title: p.title || 'BudgetWise', body: p.body || 'Push received ✓' });
                pushToastTimer.current = setTimeout(() => setPushToast(null), 6000);
            }
        };
        navigator.serviceWorker.addEventListener('message', handleSWMessage);
        return () => navigator.serviceWorker.removeEventListener('message', handleSWMessage);
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
            setTestResult({ success: false, message: 'Please log in to test notifications.' });
            return;
        }
        setTestResult({ success: true, message: 'Wait... sending test notification...', loading: true });
        try {
            console.log('Starting notification test...');
            const { sendTestNotification } = await import('../api/push');
            const result = await sendTestNotification(user.id);
            
            if (result.successCount > 0) {
                setTestResult({ 
                    success: true, 
                    message: `✅ Test successful! Sent to ${result.successCount} device(s).`,
                    detail: result.failureCount > 0 ? `Note: ${result.failureCount} other devices failed.` : null
                });
            } else {
                setTestResult({ 
                    success: false, 
                    message: `❌ Test failed. No devices received the notification.`,
                    detail: result.errorSummary || 'Check if notifications are enabled in your browser.'
                });
            }
            
            // Auto-clear after 10 seconds
            setTimeout(() => setTestResult(null), 10000);
        } catch (e) {
            console.error('Test failed:', e);
            let msg = `Error: ${e.message}`;
            if (e.message?.includes('Failed to fetch')) {
                msg = '❌ Cannot reach server. Please check your internet or Render dashboard.';
            }
            setTestResult({ success: false, message: msg });
            setTimeout(() => setTestResult(null), 10000);
        }
    };

    const handleDebugScheduler = async () => {
        setTestResult({ success: true, message: 'Triggering daily summary...', loading: true });
        try {
            const { debugRunScheduler } = await import('../api/push');
            const result = await debugRunScheduler();
            setTestResult({ 
                success: true, 
                message: `✅ Summary Triggered: ${result.message}`,
                detail: `Processed ${result.details.processedCount} users, sent ${result.details.sentCount} notifications.`
            });
            setTimeout(() => setTestResult(null), 10000);
        } catch (e) {
            setTestResult({ success: false, message: `❌ Scheduler Error: ${e.message}` });
            setTimeout(() => setTestResult(null), 10000);
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
        <div className="container animate-fade-in" style={{ paddingBottom: '3rem' }}>
            <header className="flex-between" style={{ 
                marginBottom: '2.5rem', 
                flexWrap: 'wrap', 
                gap: '1rem',
                background: 'var(--glass-bg)',
                padding: '1.5rem',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--glass-border)',
                boxShadow: 'var(--shadow-sm)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ 
                        width: '48px', height: '48px', 
                        borderRadius: '12px', 
                        background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(59,130,246,0.1))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <SettingsIcon size={24} style={{ color: 'var(--primary)' }} />
                    </div>
                    <div>
                        <h1 className="text-gradient" style={{ margin: 0, fontSize: '1.8rem', lineHeight: '1.2' }}>Settings</h1>
                        <p style={{ color: 'var(--text-muted)', margin: '0.2rem 0 0 0', fontSize: '0.95rem' }}>Personalize your financial experience</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                        onClick={() => toggleAvatarPicker(true)}
                        className="btn btn-outline"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '12px' }}
                    >
                        <Sparkles size={18} color="var(--primary)" />
                        Change Avatar
                    </button>
                    {deferredPrompt && (
                        <button
                            onClick={handleInstallClick}
                            className="btn btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '12px' }}
                        >
                            <Download size={18} />
                            Install App
                        </button>
                    )}
                </div>
            </header>

            {/* Settings Grid Container */}
            <div className="settings-grid">
                {/* Income Settings Section */}
                {/* Income Settings Section */}
                <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
                        <h2 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '6px', borderRadius: '8px', display: 'flex' }}>
                                <Wallet size={18} color="var(--success)" />
                            </div>
                            Income Settings
                        </h2>
                        <button
                            onClick={() => updateIncomeEnabled(!incomeEnabled)}
                            className="btn"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 14px',
                                fontSize: '0.82rem',
                                fontWeight: '600',
                                borderRadius: '20px',
                                background: incomeEnabled
                                    ? 'var(--surface-light)'
                                    : 'rgba(239, 68, 68, 0.1)',
                                color: incomeEnabled ? 'var(--text-main)' : 'var(--danger)',
                                border: `1px solid ${incomeEnabled ? 'var(--glass-stroke)' : 'rgba(239, 68, 68, 0.3)'}`,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                            }}
                            onMouseEnter={e => {
                                if(incomeEnabled) {
                                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                                    e.currentTarget.style.color = 'var(--danger)';
                                    e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                                }
                            }}
                            onMouseLeave={e => {
                                if(incomeEnabled) {
                                    e.currentTarget.style.background = 'var(--surface-light)';
                                    e.currentTarget.style.color = 'var(--text-main)';
                                    e.currentTarget.style.borderColor = 'var(--glass-stroke)';
                                }
                            }}
                        >
                            <div style={{
                                width: '8px', height: '8px', borderRadius: '50%',
                                background: incomeEnabled ? 'var(--success)' : 'var(--danger)',
                                boxShadow: `0 0 8px ${incomeEnabled ? 'var(--success)' : 'var(--danger)'}`
                            }} />
                            {incomeEnabled ? 'Enabled' : 'Disabled'}
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
                <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
                        <h2 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '6px', borderRadius: '8px', display: 'flex' }}>
                                <Activity size={18} color="var(--primary)" />
                            </div>
                            Budget Preferences
                        </h2>
                        <button
                            onClick={() => updateBudgetEnabled(!budgetEnabled)}
                            className="btn"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 14px',
                                fontSize: '0.82rem',
                                fontWeight: '600',
                                borderRadius: '20px',
                                background: budgetEnabled
                                    ? 'var(--surface-light)'
                                    : 'rgba(239, 68, 68, 0.1)',
                                color: budgetEnabled ? 'var(--text-main)' : 'var(--danger)',
                                border: `1px solid ${budgetEnabled ? 'var(--glass-stroke)' : 'rgba(239, 68, 68, 0.3)'}`,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                            }}
                            onMouseEnter={e => {
                                if(budgetEnabled) {
                                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                                    e.currentTarget.style.color = 'var(--danger)';
                                    e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                                }
                            }}
                            onMouseLeave={e => {
                                if(budgetEnabled) {
                                    e.currentTarget.style.background = 'var(--surface-light)';
                                    e.currentTarget.style.color = 'var(--text-main)';
                                    e.currentTarget.style.borderColor = 'var(--glass-stroke)';
                                }
                            }}
                        >
                            <div style={{
                                width: '8px', height: '8px', borderRadius: '50%',
                                background: budgetEnabled ? 'var(--success)' : 'var(--danger)',
                                boxShadow: `0 0 8px ${budgetEnabled ? 'var(--success)' : 'var(--danger)'}`
                            }} />
                            {budgetEnabled ? 'Enabled' : 'Disabled'}
                        </button>
                    </div>

                    {/* Info banner shown when budget limit is disabled */}
                    {!budgetEnabled && (
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
                            <span>Budget Limit is <strong>disabled</strong>. The Dashboard will show <strong>None</strong> for Budget Limit and Budget Remaining.</span>
                        </div>
                    )}

                    <div style={{ marginBottom: '1.5rem', opacity: budgetEnabled ? 1 : 0.4, pointerEvents: budgetEnabled ? 'auto' : 'none', transition: 'opacity 0.3s ease' }}>
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
                <div className="glass-panel" style={{ gridColumn: '1 / -1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', margin: 0 }}>
                            <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '6px', borderRadius: '8px', display: 'flex' }}>
                                <Bell size={18} color="var(--warning)" />
                            </div>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '6px', borderRadius: '8px', display: 'flex' }}>
                            <Activity size={18} color="var(--cat-shopping)" />
                        </div>
                        Daily Budget Summary
                    </h2>
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
                            fontWeight: '600',
                            color: 'white'
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

            <div className="glass-panel" style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ background: 'rgba(236, 72, 153, 0.1)', padding: '6px', borderRadius: '8px', display: 'flex' }}>
                        <Bell size={18} color="var(--cat-entertainment)" />
                    </div>
                    Notification Controls
                </h2>

                {/* ── Notification Status Badge ── */}
                {(() => {
                    const granted = notifPermission === 'granted';
                    const denied  = notifPermission === 'denied';
                    const defaultP = !granted && !denied;
                    const allGood  = granted && swActive;

                    let bgColor, borderColor, icon, title, detail;
                    if (allGood)    { bgColor = 'rgba(16,185,129,0.08)'; borderColor = 'rgba(16,185,129,0.35)'; icon = <BellRing size={18} color="var(--success)" />; title = 'Notifications Active'; detail = 'System push & daily summaries are fully enabled.'; }
                    else if (denied) { bgColor = 'rgba(239,68,68,0.08)'; borderColor = 'rgba(239,68,68,0.35)';   icon = <BellOff  size={18} color="var(--danger)" />;  title = 'Notifications Blocked'; detail = 'Open your browser site settings and allow notifications for this site, then re-subscribe below.'; }
                    else if (granted && !swActive) { bgColor = 'rgba(251,191,36,0.08)'; borderColor = 'rgba(251,191,36,0.4)'; icon = <Wifi size={18} color="var(--warning)" />; title = 'Service Worker Not Ready'; detail = 'Hard-refresh (Ctrl+Shift+R) and re-subscribe. Push will work once the SW is active.'; }
                    else             { bgColor = 'rgba(59,130,246,0.08)'; borderColor = 'rgba(59,130,246,0.35)'; icon = <Bell size={18} color="var(--primary)" />;   title = 'Permission Not Yet Granted'; detail = 'Click "Enable Notifications" below to allow push notifications.'; }

                    return (
                        <div style={{ padding: '0.85rem 1rem', background: bgColor, border: `1px solid ${borderColor}`, borderRadius: '10px', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                            <div style={{ flexShrink: 0, marginTop: '2px' }}>{icon}</div>
                            <div>
                                <p style={{ fontWeight: '600', margin: 0, fontSize: '0.95rem' }}>{title}</p>
                                <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{detail}</p>
                            </div>
                        </div>
                    );
                })()}

                {/* Inline push toast — appears in place of intrusive alert */}
                {pushToast && (
                    <div className="animate-fade-in" style={{ padding: '0.75rem 1rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.4)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                        <div>
                            <p style={{ margin: 0, fontWeight: '600', fontSize: '0.9rem' }}>🔔 {pushToast.title}</p>
                            <p style={{ margin: '0.15rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>{pushToast.body}</p>
                        </div>
                        <button onClick={() => setPushToast(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem' }}>
                            <X size={16} />
                        </button>
                    </div>
                )}

                {/* ── Enable Notifications (shown only when permission = default) ── */}
                {notifPermission === 'default' && (
                    <button
                        onClick={async () => {
                            const result = await requestNotificationPermission();
                            if (result === 'granted' && user) {
                                const { subscribeUserToPush } = await import('../api/push');
                                await subscribeUserToPush(user.id, true);
                                setPushToast({ title: 'Notifications Enabled ✓', body: 'You will now receive budget summaries and reminders.' });
                                pushToastTimer.current = setTimeout(() => setPushToast(null), 5000);
                            }
                        }}
                        className="btn btn-primary"
                        style={{ width: '100%', justifyContent: 'center', gap: '0.5rem' }}
                    >
                        <BellRing size={18} /> Enable Notifications
                    </button>
                )}

                {/* ── Force Re-subscribe ── */}
                <button
                    onClick={async () => {
                        if (!user) return;
                        try {
                            const API_BASE = import.meta.env.VITE_API_URL || 'https://budget-planner-clean-1.onrender.com/api';
                            const res = await fetch(`${API_BASE}/subscriptions/${user.id}/all`, { method: 'DELETE' });
                            await res.json();
                            if ('serviceWorker' in navigator) {
                                const reg = await navigator.serviceWorker.ready;
                                await reg.update().catch(e => console.warn('SW Update failed:', e));
                                const existing = await reg.pushManager.getSubscription();
                                if (existing) await existing.unsubscribe();
                            }
                            const { subscribeUserToPush } = await import('../api/push');
                            await subscribeUserToPush(user.id, true);
                            setPushToast({ title: '✅ Re-subscribed', body: 'Fresh subscription registered. Test notification now.' });
                            pushToastTimer.current = setTimeout(() => setPushToast(null), 6000);
                        } catch (err) {
                            console.error('Re-subscribe failed:', err);
                            setPushToast({ title: '❌ Re-subscribe failed', body: err.message });
                            pushToastTimer.current = setTimeout(() => setPushToast(null), 8000);
                        }
                    }}
                    className="btn btn-outline"
                    style={{ width: '100%', justifyContent: 'center' }}
                >
                    🔄 Force Re-subscribe (Fix broken notifications)
                </button>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button
                        onClick={handleTestNotification}
                        className="btn btn-outline"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, justifyContent: 'center' }}
                        disabled={notifPermission !== 'granted'}
                    >
                        <Activity size={18} /> Test Notification
                    </button>

                    <button
                        onClick={handleDebugScheduler}
                        className="btn btn-outline"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, justifyContent: 'center', borderColor: 'var(--success)', color: 'var(--success)' }}
                        disabled={notifPermission !== 'granted'}
                    >
                        <RefreshCw size={18} /> Force Run Daily Summary
                    </button>
                </div>

                {/* Inline Test Results */}
                {testResult && (
                    <div className="animate-fade-in" style={{
                        marginTop: '1rem',
                        padding: '1rem',
                        borderRadius: '12px',
                        background: testResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        border: `1px solid ${testResult.success ? 'var(--success)' : 'var(--danger)'}`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.4rem',
                        transition: 'all 0.3s ease'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ 
                                fontWeight: '600', 
                                color: testResult.success ? 'var(--success)' : 'var(--danger)',
                                fontSize: '0.95rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                {testResult.loading && <RefreshCw size={14} className="animate-spin" />}
                                {testResult.message}
                            </span>
                            <button 
                                onClick={() => setTestResult(null)}
                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                            >
                                <X size={14} />
                            </button>
                        </div>
                        {testResult.detail && (
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                {testResult.detail}
                            </p>
                        )}
                    </div>
                )}
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    If notifications are broken: click "Force Re-subscribe" then "Test Notification".
                </p>
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
