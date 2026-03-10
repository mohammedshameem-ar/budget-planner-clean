import React, { useState, useMemo } from 'react';
import { useBudget } from '../context/BudgetContext';

const ActivityCalendar = ({ transactions }) => {
    const today = new Date();
    const [currentYear, setCurrentYear] = useState(today.getFullYear());

    const { budgetLimit } = useBudget();

    // Map transactions to dates for the current year
    const activityMap = useMemo(() => {
        return transactions.reduce((acc, t) => {
            if (t.type === 'income') return acc;
            const d = new Date(t.date);
            if (d.getFullYear() === currentYear) {
                const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                acc[dateStr] = (acc[dateStr] || 0) + parseFloat(t.amount || 0);
            }
            return acc;
        }, {});
    }, [transactions, currentYear]);

    // Colors for activity levels
    const getColor = (amount) => {
        if (!amount || amount <= 0) return 'var(--activity-0)';

        const limit = budgetLimit || 1; // prevent division by zero
        const percentage = (amount / limit) * 100;

        if (percentage >= 10) return 'var(--activity-4)'; // Red (>= 10%)
        if (percentage >= 7.5) return 'var(--activity-3)'; // Orange (>= 7.5%)
        if (percentage >= 5) return 'var(--activity-2)'; // Yellow (>= 5%)
        return 'var(--activity-1)'; // Green (< 5%)
    };

    const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    const monthDataArray = useMemo(() => {
        return months.map((monthName, index) => {
            const daysInMonth = new Date(currentYear, index + 1, 0).getDate();
            const firstDayOfMonth = new Date(currentYear, index, 1).getDay(); // 0 is Sunday

            const days = [];
            // Add padding (nulls) so the 1st lies on the correct row (Sunday=0, Monday=1, etc)
            for (let i = 0; i < firstDayOfMonth; i++) {
                days.push(null);
            }
            // Add actual days
            for (let i = 1; i <= daysInMonth; i++) {
                days.push(new Date(currentYear, index, i));
            }
            return {
                name: monthName,
                days
            };
        });
    }, [currentYear]);

    return (
        <div className="activity-calendar-wrapper">
            <style>
                {`
                .activity-calendar-wrapper {
                    padding: 1.5rem;
                    overflow-x: auto;
                    color: var(--text-main);
                }
                .calendar-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1rem;
                    min-width: 800px; /* Align with the inner grid width */
                }
                .calendar-title {
                    font-size: 1rem;
                    font-weight: 600;
                }
                .year-controls {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                .year-btn {
                    background: var(--bg-card);
                    border: 1px solid var(--border-color, #e5e7eb);
                    color: var(--text-main);
                    padding: 4px 12px;
                    border-radius: 6px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.875rem;
                    transition: background 0.2s;
                }
                .year-btn:hover {
                    background: var(--activity-0);
                }
                .calendar-grid-container {
                    display: flex;
                    flex-direction: column;
                    min-width: 800px;
                }
                .calendar-body {
                    display: flex;
                    gap: 0.5rem;
                }
                .day-labels {
                    display: grid;
                    grid-template-rows: repeat(7, 12px);
                    gap: 3px;
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    width: 30px;
                    margin-top: 22px; /* to align with the grid days below the month label */
                }
                .day-label {
                    display: flex;
                    align-items: center;
                    height: 12px;
                    line-height: 1;
                }
                .months-container {
                    display: flex;
                    gap: 1.5rem; /* Distinct gap between months */
                }
                .month-block {
                    display: flex;
                    flex-direction: column;
                }
                .month-label-inline {
                    height: 20px;
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    margin-bottom: 2px;
                }
                .month-grid {
                    display: grid;
                    grid-template-rows: repeat(7, 12px);
                    grid-auto-flow: column;
                    gap: 3px;
                }
                .grid-day {
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    background: var(--activity-0);
                    cursor: pointer;
                    position: relative;
                }
                .grid-day.empty {
                    background: transparent;
                    cursor: default;
                }
                .grid-day.empty:hover {
                    border: none;
                }
                .grid-day:not(.empty):hover {
                    border: 1px solid var(--text-muted);
                }
                .grid-day[title]:hover:after {
                    content: attr(title);
                    position: absolute;
                    bottom: 100%;
                    left: 50%;
                    transform: translateX(-50%);
                    background: var(--sidebar-bg, #1f2937);
                    color: white;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 0.7rem;
                    white-space: nowrap;
                    z-index: 10;
                    margin-bottom: 5px;
                }
                .calendar-legend {
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                    gap: 0.5rem;
                    margin-top: 1.5rem;
                    font-size: 0.75rem;
                    color: var(--text-muted);
                }
                .legend-scale {
                    display: flex;
                    gap: 3px;
                }
                
                :root {
                    --activity-0: rgba(155, 155, 155, 0.1);
                    --activity-1: #86efac; /* Light Green */
                    --activity-2: #fde047; /* Yellow */
                    --activity-3: #fb923c; /* Orange */
                    --activity-4: #f87171; /* Light Red */
                }
                
                [data-theme='dark'] {
                    --activity-0: rgba(255, 255, 255, 0.05);
                    --activity-1: #4ade80;
                    --activity-2: #facc15;
                    --activity-3: #f97316;
                    --activity-4: #ef4444;
                }
                `}
            </style>

            <div className="calendar-header">
                <div className="calendar-title">{/* Optional title area */}</div>
                <div className="year-controls">
                    <button className="year-btn" onClick={() => setCurrentYear(y => y - 1)}>
                        &lt;
                    </button>
                    <span>{currentYear}</span>
                    <button className="year-btn" onClick={() => setCurrentYear(y => y + 1)} disabled={currentYear === today.getFullYear()}>
                        &gt;
                    </button>
                </div>
            </div>

            <div className="calendar-grid-container">
                <div className="calendar-body">
                    <div className="day-labels">
                        <div className="day-label"></div>
                        <div className="day-label">Mon</div>
                        <div className="day-label"></div>
                        <div className="day-label">Wed</div>
                        <div className="day-label"></div>
                        <div className="day-label">Fri</div>
                        <div className="day-label"></div>
                    </div>

                    <div className="months-container">
                        {monthDataArray.map((monthData, mIndex) => (
                            <div key={mIndex} className="month-block">
                                <div className="month-label-inline">{monthData.name}</div>
                                <div className="month-grid">
                                    {monthData.days.map((day, dIndex) => {
                                        if (!day) {
                                            return <div key={`empty-${dIndex}`} className="grid-day empty" />;
                                        }
                                        const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
                                        const amount = activityMap[dateStr] || 0;
                                        return (
                                            <div
                                                key={`day-${dIndex}`}
                                                className="grid-day"
                                                style={{ backgroundColor: getColor(amount) }}
                                                title={`₹${amount.toLocaleString()} spent on ${day.toLocaleDateString()}`}
                                                onClick={() => {
                                                    const el = document.getElementById('transaction-history');
                                                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                                                }}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="calendar-legend" style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div className="grid-day" style={{ backgroundColor: 'var(--activity-0)' }}></div>
                        <span>0%</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div className="grid-day" style={{ backgroundColor: 'var(--activity-1)' }}></div>
                        <span>&lt; 5%</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div className="grid-day" style={{ backgroundColor: 'var(--activity-2)' }}></div>
                        <span>5-7.5%</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div className="grid-day" style={{ backgroundColor: 'var(--activity-3)' }}></div>
                        <span>7.5-10%</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div className="grid-day" style={{ backgroundColor: 'var(--activity-4)' }}></div>
                        <span>10%+ of Limit</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ActivityCalendar;
