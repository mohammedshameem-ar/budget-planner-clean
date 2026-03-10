import { useState, useEffect } from 'react';
import { useBudget } from '../context/BudgetContext';
import { Plus, Trash2, Target, Calendar, CheckCircle, Bell, ChevronDown, ChevronRight, X, AlertCircle } from 'lucide-react';
import Modal from '../components/Modal';

const PlanForm = ({ onClose }) => {
    const { addPlan } = useBudget();
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.name || !formData.amount) {
            setError('Please enter both name and amount.');
            return;
        }

        addPlan({
            name: formData.name,
            amount: parseFloat(formData.amount),
            description: formData.description,
            targetDate: formData.date
        });
        onClose();
    };

    return (
        <Modal title="Add New Plan" onClose={onClose}>
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
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Quick Presets:</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {['Trip', 'Vacation', 'Buying something', 'EMI', 'Trust'].map(preset => (
                        <button
                            key={preset}
                            type="button"
                            onClick={() => setFormData({ ...formData, name: preset })}
                            style={{
                                fontSize: '0.7rem',
                                padding: '0.2rem 0.6rem',
                                borderRadius: '15px',
                                background: 'var(--surface-light)',
                                color: 'var(--text-main)',
                                border: '1px solid var(--glass-border)',
                                transition: 'all 0.2s'
                            }}
                        >
                            {preset}
                        </button>
                    ))}
                </div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Plan Name</label>
                    <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Trip to Goa, New Car"
                    />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Target Amount</label>
                        <input
                            type="number"
                            required
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            placeholder="0.00"
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Target Date</label>
                        <input
                            type="date"
                            required
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        />
                    </div>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Description (Optional)</label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Details about this plan..."
                        style={{
                            width: '100%', minHeight: '60px', padding: '0.75rem', borderRadius: '0.5rem',
                            border: '1px solid var(--glass-border)', background: 'rgba(255, 255, 255, 0.05)',
                            color: 'var(--text-main)', fontFamily: 'inherit', fontSize: '0.875rem'
                        }}
                    />
                </div>
                <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem', justifyContent: 'center', padding: '0.8rem' }}>
                    Save Plan
                </button>
            </form>
        </Modal>
    );
};

const Planning = () => {
    const { plans, deletePlan, updatePlan, savings, updateSavings } = useBudget();
    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        const handleOpen = () => setShowForm(true);
        window.addEventListener('open-plan-modal', handleOpen);
        return () => window.removeEventListener('open-plan-modal', handleOpen);
    }, []);

    const [addingFunds, setAddingFunds] = useState(null); // { id: planId, amount: '', useSavings: false }

    const handleAddFunds = async (e, plan) => {
        e.preventDefault();
        if (!addingFunds || addingFunds.id !== plan.id || !addingFunds.amount) return;

        const amountToAdd = parseFloat(addingFunds.amount);
        const currentCollected = plan.collected || 0;
        const remaining = plan.amount - currentCollected;

        // Check if amount exceeds plan limit
        if (amountToAdd > remaining) {
            alert(`Amount exceeds plan target! Maximum you can add: ₹${remaining.toLocaleString()}`);
            return;
        }

        // Check if using savings and if sufficient funds are available
        if (addingFunds.useSavings) {
            if (savings < amountToAdd) {
                alert("Insufficient savings balance!");
                return;
            }
            // Deduct from savings
            const newSavings = savings - amountToAdd;
            await updateSavings(newSavings);
        }

        const newCollected = currentCollected + amountToAdd;

        await updatePlan(plan.id, { collected: newCollected });
        setAddingFunds(null);
    };

    return (
        <div className="container animate-fade-in" style={{ paddingBottom: '1.5rem' }}>
            <header className="flex-between" style={{ marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                    <h1 className="text-gradient" style={{ fontSize: '1.35rem' }}>Planning</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Set goals and plan ahead.</p>
                </div>
                <button onClick={() => setShowForm(true)} className="btn btn-primary">
                    <Plus size={16} />
                    Add Plan
                </button>
            </header>

            {showForm && <PlanForm onClose={() => setShowForm(false)} />}

            {plans.length === 0 ? (
                <div className="glass-panel flex-center" style={{
                    flexDirection: 'column', gap: '1rem', padding: '3rem',
                    color: 'var(--text-muted)', textAlign: 'center'
                }}>
                    <Target size={48} style={{ opacity: 0.5 }} />
                    <p>No plans yet. Start by creating a financial goal!</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                    {plans.map(plan => (
                        <div key={plan.id} className="glass-panel plan-card">
                            <div className="plan-actions">
                                <button
                                    onClick={() => deletePlan(plan.id)}
                                    className="btn-delete"
                                    title="Delete Plan"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>

                            <div className="plan-content">
                                <div className="plan-header">
                                    <h3 className="plan-title">{plan.name}</h3>
                                    {plan.collected >= plan.amount && (
                                        <CheckCircle size={20} className="text-success" />
                                    )}
                                </div>
                                <div className="plan-amount text-gradient">
                                    ₹{parseFloat(plan.amount).toLocaleString()}
                                </div>

                                <div className="plan-meta">
                                    <Calendar size={16} />
                                    <span>Target: {new Date(plan.targetDate).toLocaleDateString()}</span>
                                </div>

                                {plan.description && (
                                    <div className="plan-description">
                                        {plan.description}
                                    </div>
                                )}

                                {/* Progress Section */}
                                {plan.collected >= plan.amount ? (
                                    <div className="plan-completed-badge">
                                        <CheckCircle size={18} />
                                        Completed
                                    </div>
                                ) : (
                                    <>
                                        <div className="plan-progress-container">
                                            <div className="flex-between stats-labels">
                                                <span className="label-collected">Collected</span>
                                                <span className="label-amount">₹{(plan.collected || 0).toLocaleString()} / ₹{parseFloat(plan.amount).toLocaleString()}</span>
                                            </div>
                                            <div className="progress-track">
                                                <div className="progress-fill" style={{
                                                    width: `${Math.min(((plan.collected || 0) / plan.amount) * 100, 100)}%`
                                                }} />
                                            </div>
                                            <p className="plan-remaining">
                                                ₹{(plan.amount - (plan.collected || 0)).toLocaleString()} remaining
                                            </p>
                                        </div>

                                        {/* Add Funds Section */}
                                        {addingFunds?.id === plan.id ? (
                                            <form onSubmit={(e) => handleAddFunds(e, plan)} className="add-funds-form">
                                                <div className="flex-center input-group">
                                                    <input
                                                        type="number"
                                                        value={addingFunds.amount}
                                                        onChange={(e) => setAddingFunds({ ...addingFunds, amount: e.target.value })}
                                                        placeholder="Amount"
                                                        className="amount-input"
                                                        autoFocus
                                                    />
                                                    <button type="submit" className="btn btn-primary action-btn">
                                                        <Plus size={18} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setAddingFunds(null)}
                                                        className="btn btn-outline action-btn"
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
                                                    <input
                                                        type="checkbox"
                                                        id={`useSavings-${plan.id}`}
                                                        checked={addingFunds.useSavings || false}
                                                        onChange={(e) => setAddingFunds({ ...addingFunds, useSavings: e.target.checked })}
                                                        style={{ cursor: 'pointer' }}
                                                    />
                                                    <label htmlFor={`useSavings-${plan.id}`} style={{ cursor: 'pointer', color: 'var(--text-muted)' }}>
                                                        Collect from Savings (Bal: ₹{savings.toLocaleString()})
                                                    </label>
                                                </div>
                                            </form>
                                        ) : (
                                            <button
                                                className="btn btn-outline"
                                                onClick={() => setAddingFunds({ id: plan.id, amount: '', useSavings: false })}
                                                style={{ width: '100%', justifyContent: 'center' }}
                                            >
                                                <Plus size={16} /> Add Funds
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    ))
                    }
                </div >
            )}
        </div >
    );
};

export default Planning;
