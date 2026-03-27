import { useState } from 'react';
import { useBudget } from '../context/BudgetContext';
import Modal from './Modal';

const categories = [
    'food', 'transport', 'utilities', 'entertainment', 'health', 'shopping', 'housing', 'savings', 'billings', 'recharges', 'others'
];

const TransactionForm = ({ onClose }) => {
    const { addTransaction } = useBudget();
    const [formData, setFormData] = useState({
        amount: '',
        type: 'expense',
        category: 'food',
        date: new Date().toLocaleDateString('en-CA'),
        note: ''
    });

    // Auto-switch type based on category
    const handleCategoryChange = (cat) => {
        let newType = formData.type;
        if (cat === 'savings') {
            newType = 'income';
        } else {
            newType = 'expense';
        }
        setFormData({ ...formData, category: cat, type: newType });
    };

    const evaluateExpression = (expression) => {
        try {
            // sanitize input: only allow numbers, operators, dots and spaces
            const sanitized = expression.replace(/[^0-9+\-*/.()\s]/g, '');
            if (!sanitized) return '';
            // Safe evaluation using Function constructor with strict mode
            // eslint-disable-next-line no-new-func
            const result = new Function('return ' + sanitized)();
            return isFinite(result) ? parseFloat(result.toFixed(2)).toString() : '';
        } catch (error) {
            return expression; // Return original if invalid
        }
    };

    const handleAmountBlur = () => {
        if (formData.amount) {
            const calculated = evaluateExpression(formData.amount);
            setFormData(prev => ({ ...prev, amount: calculated }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.amount) return;

        addTransaction({
            amount: parseFloat(formData.amount),
            type: formData.type,
            category: formData.category,
            date: formData.date,
            note: formData.note
        });
        onClose();
    };

    return (
        <Modal title="Add Transaction" onClose={onClose}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', background: 'var(--surface-light)', padding: '0.4rem', borderRadius: '12px', marginBottom: '0.5rem' }}>
                    <button
                        type="button"
                        onClick={() => setFormData({ ...formData, type: 'expense', category: 'food' })}
                        style={{
                            flex: 1, padding: '0.6rem', borderRadius: '8px', border: 'none',
                            background: formData.type === 'expense' ? 'var(--danger)' : 'transparent',
                            color: formData.type === 'expense' ? 'white' : 'var(--text-muted)',
                            fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease'
                        }}
                    >Expense</button>
                    <button
                        type="button"
                        onClick={() => setFormData({ ...formData, type: 'income', category: 'savings' })}
                        style={{
                            flex: 1, padding: '0.6rem', borderRadius: '8px', border: 'none',
                            background: formData.type === 'income' ? 'var(--success)' : 'transparent',
                            color: formData.type === 'income' ? 'white' : 'var(--text-muted)',
                            fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease'
                        }}
                    >Income</button>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.8rem', fontSize: '0.95rem', fontWeight: '600' }}>Amount <span style={{ color: 'var(--primary)', fontSize: '0.8rem', fontWeight: '400', display: 'block', marginTop: '0.2rem' }}>(allows calculation e.g. 10+20)</span></label>
                    <input
                        type="text"
                        inputMode="decimal"
                        required
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        onBlur={handleAmountBlur}
                        placeholder="0.00 or 10+20"
                        style={{ fontSize: '1.2rem', padding: '0.8rem' }}
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Category</label>
                    <select
                        value={formData.category}
                        onChange={(e) => handleCategoryChange(e.target.value)}
                        style={{ textTransform: 'capitalize' }}
                    >
                        {formData.type === 'income' ? (
                            <option value="savings">Savings</option>
                        ) : (
                            categories
                                .filter(c => !['salary', 'investment', 'savings'].includes(c))
                                .map(c => <option key={c} value={c}>{c}</option>)
                        )}
                    </select>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Note (Optional)</label>
                    <textarea
                        value={formData.note}
                        onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                        placeholder="Add a note..."
                        style={{
                            width: '100%',
                            minHeight: '60px',
                            resize: 'vertical',
                            padding: '0.75rem',
                            borderRadius: '0.5rem',
                            border: '1px solid var(--glass-border)',
                            background: 'rgba(255, 255, 255, 0.05)',
                            color: 'var(--text-main)',
                            fontFamily: 'inherit'
                        }}
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Date</label>
                    <input
                        type="date"
                        required
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                </div>

                <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', justifyContent: 'center', height: '48px', fontSize: '1rem' }}>
                    Add {formData.type === 'income' ? 'Income' : 'Expense'}
                </button>
            </form>
        </Modal>
    );
};

export default TransactionForm;
