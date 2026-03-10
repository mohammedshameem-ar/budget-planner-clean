import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBudget } from '../context/BudgetContext';
import SummaryCard from '../components/SummaryCard';
import TransactionList from '../components/TransactionList';
import ExpenseChart from '../components/ExpenseChart';
import TransactionForm from '../components/TransactionForm';
import OnlineServicesForm from '../components/OnlineServicesForm';
import streakIcon from '../assets/streak.png';
import { Wallet, TrendingDown, PiggyBank, Plus, Minus, CheckCircle, Download, LayoutDashboard, AlertCircle, Globe } from 'lucide-react';

const Dashboard = () => {
    const { user } = useAuth();
    const {
        budgetLimit,
        transactions,
        getSummary,
        plans,
        addToSavings,
        contributeFromBalance,
    } = useBudget();
    const summary = getSummary();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isOnlineServicesModalOpen, setIsOnlineServicesModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [streakActive, setStreakActive] = useState(false);
    const [streakAnimating, setStreakAnimating] = useState(false);
    const streakRef = useRef(null);

    // Inject streak animation keyframes once
    useEffect(() => {
        if (document.getElementById('streak-anim-styles')) return;
        const style = document.createElement('style');
        style.id = 'streak-anim-styles';
        style.textContent = `
            @keyframes boltShoot {
                0% { transform: translate(0, 0) scaleY(1); opacity: 1; }
                60% { opacity: 1; }
                100% { transform: translate(var(--tx), var(--ty)) scaleY(0.3); opacity: 0; }
            }
            @keyframes thunderFlash {
                0% { box-shadow: 0 0 0 rgba(255,255,255,0); background: #ffffff; }
                10% { box-shadow: 0 0 40px rgba(255,255,255,0.9), 0 0 80px rgba(250,204,21,0.5); }
                25% { box-shadow: 0 0 10px rgba(255,255,255,0.3); }
                35% { box-shadow: 0 0 35px rgba(250,204,21,0.8), 0 0 60px rgba(245,158,11,0.4); }
                100% { box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4); }
            }
            @keyframes streakPop {
                0% { transform: scale(1); }
                15% { transform: scale(1.25); }
                35% { transform: scale(0.92); }
                100% { transform: scale(1); }
            }
            @keyframes screenFlash {
                0% { opacity: 0.6; }
                100% { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }, []);

    const handleStreakClick = () => {
        const willActivate = !streakActive;
        setStreakActive(willActivate);
        if (willActivate) {
            setStreakAnimating(true);
            const btn = streakRef.current;
            if (btn) {
                const rect = btn.getBoundingClientRect();
                const cx = rect.left + rect.width / 2;
                const cy = rect.top + rect.height / 2;

                // Quick white screen flash
                const flash = document.createElement('div');
                flash.style.cssText = `
                    position: fixed; inset: 0; z-index: 99998;
                    background: rgba(250, 204, 21, 0.15);
                    pointer-events: none;
                    animation: screenFlash 0.3s ease-out forwards;
                `;
                document.body.appendChild(flash);
                setTimeout(() => flash.remove(), 350);

                // Lightning bolt streaks (elongated thin lines)
                for (let i = 0; i < 8; i++) {
                    const bolt = document.createElement('div');
                    const angle = (Math.PI * 2 * i) / 8 + (Math.random() - 0.5) * 0.4;
                    const dist = 35 + Math.random() * 35;
                    const tx = Math.cos(angle) * dist;
                    const ty = Math.sin(angle) * dist;
                    const length = 12 + Math.random() * 16;
                    const width = 2 + Math.random() * 1.5;
                    const rotateDeg = (angle * 180 / Math.PI) + 90;
                    const colors = ['#fbbf24', '#ffffff', '#fde68a', '#fbbf24', '#fff'];
                    bolt.style.cssText = `
                        position: fixed;
                        left: ${cx - width / 2}px;
                        top: ${cy - length / 2}px;
                        width: ${width}px;
                        height: ${length}px;
                        background: ${colors[Math.floor(Math.random() * 5)]};
                        border-radius: ${width}px;
                        pointer-events: none;
                        z-index: 99999;
                        transform-origin: center center;
                        transform: rotate(${rotateDeg}deg);
                        --tx: ${tx}px;
                        --ty: ${ty}px;
                        animation: boltShoot 0.4s ease-out forwards;
                        box-shadow: 0 0 6px rgba(250, 204, 21, 0.8), 0 0 12px rgba(255, 255, 255, 0.4);
                    `;
                    document.body.appendChild(bolt);
                    setTimeout(() => bolt.remove(), 500);
                }

                // Small electric dots at the tips
                for (let i = 0; i < 6; i++) {
                    const dot = document.createElement('div');
                    const angle = Math.random() * Math.PI * 2;
                    const dist = 15 + Math.random() * 25;
                    const tx = Math.cos(angle) * dist;
                    const ty = Math.sin(angle) * dist;
                    const size = 2 + Math.random() * 2;
                    dot.style.cssText = `
                        position: fixed; left: ${cx}px; top: ${cy}px;
                        width: ${size}px; height: ${size}px;
                        background: #ffffff;
                        border-radius: 50%;
                        pointer-events: none; z-index: 99999;
                        --tx: ${tx}px; --ty: ${ty}px;
                        animation: boltShoot 0.35s ease-out forwards;
                        box-shadow: 0 0 4px #fbbf24;
                    `;
                    document.body.appendChild(dot);
                    setTimeout(() => dot.remove(), 450);
                }
            }
            setTimeout(() => setStreakAnimating(false), 500);
        }
    };

    useEffect(() => {
        const handleOpen = () => setIsModalOpen(true);
        window.addEventListener('open-transaction-modal', handleOpen);
        return () => window.removeEventListener('open-transaction-modal', handleOpen);
    }, []);

    const resetModals = () => {
        setIsSavingsModalOpen(false);
        setIsContributeModalOpen(false);
        setSavingsInputAmount('');
        setContributeError('');
    };

    const [isSavingsEditing, setIsSavingsEditing] = useState(false);
    const [newSavingsAmount, setNewSavingsAmount] = useState('');
    const [isSavingsModalOpen, setIsSavingsModalOpen] = useState(false);
    const [isContributeModalOpen, setIsContributeModalOpen] = useState(false);
    const [savingsInputAmount, setSavingsInputAmount] = useState('');
    const [savingsLoading, setSavingsLoading] = useState(false);
    const [contributeError, setContributeError] = useState('');
    const [budgetWarning, setBudgetWarning] = useState(false);

    const handleAddTransactionClick = () => {
        if (!budgetLimit || budgetLimit <= 0) {
            setBudgetWarning(true);
            setTimeout(() => setBudgetWarning(false), 3000);
            return;
        }
        setIsModalOpen(true);
    };

    const handleAddSavings = async () => {
        const val = parseFloat(savingsInputAmount);
        if (isNaN(val) || val <= 0) return;
        setSavingsLoading(true);
        setContributeError('');
        try {
            if (isContributeModalOpen) {
                await contributeFromBalance(val);
                setIsContributeModalOpen(false);
            } else {
                await addToSavings(val);
                setIsSavingsModalOpen(false);
            }
            setSavingsInputAmount('');
        } catch (e) {
            console.error(e);
            if (isContributeModalOpen) {
                setContributeError(e.message || 'Failed to contribute.');
            }
        }
        setSavingsLoading(false);
    };

    const evaluateExpression = (expression) => {
        try {
            const sanitized = expression.replace(/[^0-9+\-*/.()\s]/g, '');
            if (!sanitized) return '';
            const result = new Function('return ' + sanitized)();
            return isFinite(result) ? parseFloat(result.toFixed(2)).toString() : '';
        } catch (error) {
            return expression;
        }
    };

    const handleSavingsBlur = () => {
        if (newSavingsAmount) {
            const calculated = evaluateExpression(newSavingsAmount.toString());
            setNewSavingsAmount(calculated);
        }
    };

    const navTabs = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'transactions', label: 'Transactions', icon: Wallet },
        { id: 'budget', label: 'Budget', icon: PiggyBank },
    ];

    return (
        <div className="container animate-fade-in" style={{ paddingBottom: '2rem' }}>
            {isModalOpen && <TransactionForm onClose={() => setIsModalOpen(false)} />}
            {isOnlineServicesModalOpen && <OnlineServicesForm onClose={() => setIsOnlineServicesModalOpen(false)} />}

            {/* Savings / Contribute Quick-Add Modal */}
            {(isSavingsModalOpen || isContributeModalOpen) && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: 'rgba(0,0,0,0.55)',
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                    backdropFilter: 'blur(6px)',
                    padding: '1rem',
                    paddingTop: '15vh'
                }} onClick={resetModals}>
                    <div style={{
                        background: 'var(--surface)',
                        borderRadius: '20px',
                        padding: '2rem',
                        width: '100%',
                        maxWidth: '360px',
                        boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
                        border: '1px solid var(--glass-stroke)',
                        position: 'relative',
                        animation: 'fadeIn 0.25s ease'
                    }} onClick={e => e.stopPropagation()}>
                        {/* X close button */}
                        <button
                            onClick={resetModals}
                            style={{
                                position: 'absolute', top: '1rem', right: '1rem',
                                background: 'var(--surface-light)', border: 'none',
                                borderRadius: '50%', width: '30px', height: '30px',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'var(--text-muted)', fontSize: '1rem', fontWeight: '700',
                                transition: 'background 0.2s ease'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--glass-border)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-light)'}
                        >✕</button>

                        <h3 style={{ marginBottom: '0.25rem', fontSize: '1.1rem', fontWeight: '700', paddingRight: '2rem' }}>
                            {isContributeModalOpen ? 'Contribute to Savings' : 'Add to Savings'}
                        </h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '1.25rem' }}>
                            {isContributeModalOpen
                                ? 'Move money from available balance to your savings.'
                                : 'Enter the amount you want to add to your savings.'}
                        </p>
                        <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
                            <span style={{
                                position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                                fontSize: '1rem', color: 'var(--text-muted)', fontWeight: '700'
                            }}>₹</span>
                            <input
                                autoFocus
                                type="number"
                                min="0"
                                placeholder="0.00"
                                value={savingsInputAmount}
                                onChange={e => setSavingsInputAmount(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddSavings()}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 0.75rem 0.75rem 2rem',
                                    borderRadius: '12px',
                                    border: '1.5px solid var(--glass-stroke)',
                                    background: 'var(--surface-light)',
                                    fontSize: '1rem',
                                    color: 'var(--text)',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>
                        {contributeError && (
                            <p style={{ color: 'var(--danger)', fontSize: '0.75rem', marginBottom: '1rem', textAlign: 'center' }}>
                                {contributeError}
                            </p>
                        )}
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button
                                onClick={resetModals}
                                style={{
                                    flex: 1, padding: '0.7rem', borderRadius: '12px',
                                    border: '1.5px solid var(--glass-stroke)',
                                    background: 'transparent', cursor: 'pointer',
                                    color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.9rem'
                                }}
                            >Cancel</button>
                            <button
                                onClick={handleAddSavings}
                                disabled={savingsLoading || !savingsInputAmount}
                                style={{
                                    flex: 1, padding: '0.7rem', borderRadius: '12px',
                                    background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
                                    border: 'none', cursor: savingsLoading ? 'not-allowed' : 'pointer',
                                    color: '#fff', fontWeight: '700', fontSize: '0.9rem',
                                    opacity: (!savingsInputAmount || savingsLoading) ? 0.65 : 1
                                }}
                            >{savingsLoading ? 'Processing...' : (isContributeModalOpen ? 'Contribute' : 'Add Money')}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Horizontal Header/Nav matching reference */}
            <div className="flex-responsive" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                    }}>
                        <Wallet size={24} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1e293b', marginBottom: '-2px' }}>SpendBook</h1>
                        <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Smart expense tracking</p>
                    </div>
                    <button
                        ref={streakRef}
                        onClick={handleStreakClick}
                        title="Streak"
                        style={{
                            background: streakActive ? 'linear-gradient(135deg, #f59e0b, #ea580c)' : '#ffffff',
                            border: streakActive ? '2px solid transparent' : '2px solid #cbd5e1',
                            cursor: 'pointer',
                            padding: '3px',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: streakActive ? '0 4px 14px rgba(245, 158, 11, 0.4)' : '0 2px 6px rgba(0,0,0,0.06)',
                            animation: streakAnimating ? 'thunderFlash 0.6s ease-out, streakPop 0.5s ease-out' : 'none',
                            transition: 'background 0.3s ease, border 0.3s ease, box-shadow 0.3s ease, transform 0.2s ease'
                        }}
                        onMouseEnter={e => { if (!streakAnimating) e.currentTarget.style.transform = 'scale(1.1)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                    >
                        <img src={streakIcon} alt="Streak" style={{
                            width: '38px', height: '38px', objectFit: 'contain',
                            filter: streakActive ? 'brightness(1.1)' : 'grayscale(0.5) opacity(0.6)',
                            transition: 'filter 0.3s ease'
                        }} />
                    </button>
                </div>
                <div style={{ display: 'flex', gap: '1rem', position: 'relative', flexWrap: 'wrap' }}>
                    {budgetWarning && (
                        <div style={{
                            position: 'absolute',
                            top: '-50px',
                            right: 0,
                            padding: '0.75rem 1rem',
                            background: 'var(--danger)',
                            color: 'white',
                            borderRadius: '12px',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            boxShadow: '0 8px 16px rgba(239, 68, 68, 0.2)',
                            zIndex: 100,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            animation: 'slideIn 0.3s ease'
                        }}>
                            <AlertCircle size={16} />
                            No budget limit set!
                        </div>
                    )}
                    <button className="btn btn-outline" onClick={() => setIsOnlineServicesModalOpen(true)} style={{ backgroundColor: '#ecfdf5', color: '#059669', borderColor: '#d1fae5', height: '42px', flex: '1 1 auto', justifyContent: 'center' }}>
                        <Globe size={16} />
                        Online Services
                    </button>
                    <button className="btn btn-primary" onClick={handleAddTransactionClick} style={{ backgroundColor: '#2563eb', height: '42px', flex: '1 1 auto', justifyContent: 'center' }}>
                        <Plus size={16} />
                        Add Transaction
                    </button>
                </div>
            </div>


            {/* Summary Cards with Refined Logic */}
            <div className="summary-grid" style={{
                marginBottom: '2rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1.5rem'
            }}>
                <SummaryCard
                    title="Total Income"
                    amount={summary.totalIncome}
                    icon={TrendingDown}
                    gradient="var(--grad-income)"
                />
                <SummaryCard
                    title="Available Balance"
                    amount={summary.availableBalance}
                    icon={Wallet}
                    gradient="var(--grad-balance)"
                    actionLabel={summary.availableBalance !== null && summary.availableBalance > 0 ? "Contribute" : null}
                    onAction={summary.availableBalance !== null && summary.availableBalance > 0 ? () => setIsContributeModalOpen(true) : null}
                />
                <SummaryCard
                    title="Total Expenses"
                    amount={summary.monthExpenses}
                    icon={TrendingDown}
                    gradient="var(--grad-expenses)"
                />
                <SummaryCard
                    title="Budget Limit"
                    amount={summary.budgetLimit}
                    icon={PiggyBank}
                    gradient="var(--grad-limit)"
                />
                <SummaryCard
                    title="Budget Remaining"
                    amount={summary.remainingBudget}
                    icon={CheckCircle}
                    gradient="var(--grad-remaining)"
                />
                <SummaryCard
                    title="Total Savings"
                    amount={summary.totalSavings}
                    icon={PiggyBank}
                    gradient="var(--grad-savings)"
                    onEdit={() => { setSavingsInputAmount(''); setIsSavingsModalOpen(true); }}
                />
            </div>


            <div className="dashboard-grid">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <ExpenseChart transactions={transactions} />

                    {/* Plans Widget */}
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Financial Plans</h3>
                        {plans.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)' }}>No plans set yet.</p>
                        ) : (
                            <div
                                className="custom-scrollbar"
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '1rem',
                                    height: '240px',
                                    overflowY: 'auto',
                                    paddingRight: '0.8rem',
                                    paddingBottom: '1.5rem',
                                }}
                            >
                                {plans.map(plan => (
                                    <div key={plan.id} style={{
                                        padding: '1rem',
                                        background: 'var(--surface-light)',
                                        borderRadius: '12px',
                                        border: '1px solid var(--glass-stroke)',
                                        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
                                        cursor: 'default'
                                    }}
                                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(3px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(99,102,241,0.1)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = 'var(--glass-stroke)'; }}
                                    >
                                        <div className="flex-between" style={{ marginBottom: '0.75rem' }}>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <p style={{ fontWeight: '600', fontSize: '0.9rem' }}>{plan.name}</p>
                                                    {plan.collected >= plan.amount && (
                                                        <CheckCircle size={16} color="var(--success)" />
                                                    )}
                                                </div>
                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Target: {new Date(plan.targetDate).toLocaleDateString()}</p>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: '0.9rem' }}>
                                                    ₹{(plan.collected || 0).toLocaleString()} <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: '400' }}>/ ₹{parseFloat(plan.amount).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Mini Progress Bar */}
                                        <div style={{ width: '100%', height: '6px', background: 'var(--glass-stroke)', borderRadius: '3px', overflow: 'hidden' }}>
                                            <div style={{
                                                width: `${Math.min(((plan.collected || 0) / plan.amount) * 100, 100)}%`,
                                                height: '100%',
                                                background: 'var(--primary)',
                                                borderRadius: '3px',
                                                transition: 'width 0.4s ease'
                                            }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <TransactionList
                        transactions={transactions.filter(t => !t.logo)}
                        title="Recent Transactions"
                    />
                    {transactions.some(t => t.logo) && (
                        <TransactionList
                            transactions={transactions.filter(t => t.logo)}
                            title="Online Services History"
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
