import { useState } from 'react';
import { useBudget } from '../context/BudgetContext';
import Modal from './Modal';

const categories = [
    'food', 'transport', 'utilities', 'entertainment', 'health', 'shopping', 'housing', 'salary', 'investment', 'savings', 'billings', 'recharges', 'others'
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
            type: 'expense', // Always expense
            category: formData.category,
            date: formData.date,
            note: formData.note
        });
        onClose();
    };

    return (
        <Modal title="Add Transaction" onClose={onClose}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Category</label>
                    <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        style={{ textTransform: 'capitalize' }}
                    >
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
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

                <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', justifyContent: 'center' }}>
                    Add Transaction
                </button>
            </form>
        </Modal>
    );
};

export default TransactionForm;
