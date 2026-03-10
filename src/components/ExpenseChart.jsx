import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { useMemo } from 'react';

ChartJS.register(ArcElement, Tooltip, Legend);

const ExpenseChart = ({ transactions }) => {
    const chartData = useMemo(() => {
        const expenses = transactions.filter(t => t.type === 'expense');
        const categories = {};

        expenses.forEach(t => {
            const cat = t.category || 'Others';
            categories[cat] = (categories[cat] || 0) + parseFloat(t.amount);
        });

        return {
            labels: Object.keys(categories).map(cat => cat.charAt(0).toUpperCase() + cat.slice(1)),
            datasets: [
                {
                    data: Object.values(categories),
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.8)',
                        'rgba(54, 162, 235, 0.8)',
                        'rgba(255, 206, 86, 0.8)',
                        'rgba(75, 192, 192, 0.8)',
                        'rgba(153, 102, 255, 0.8)',
                        'rgba(255, 159, 64, 0.8)',
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(255, 159, 64, 1)',
                    ],
                    borderWidth: 1,
                },
            ],
        };
    }, [transactions]);

    const options = {
        plugins: {
            legend: {
                position: 'right',
                labels: {
                    color: '#64748b', // Light mode muted color
                    font: {
                        family: "'Inter', sans-serif"
                    }
                }
            }
        },
        cutout: '70%',
        responsive: true,
        maintainAspectRatio: false
    };

    return (
        <div className="glass-panel">
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Expense Breakdown</h3>
            <div style={{ height: '300px' }}>
                {transactions.filter(t => t.type === 'expense').length > 0 ? (
                    <Doughnut data={chartData} options={options} />
                ) : (
                    <div className="flex-center" style={{ height: '100%', color: 'var(--text-muted)' }}>
                        No expense data available
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExpenseChart;

