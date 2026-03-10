import { Pencil } from 'lucide-react';

const SummaryCard = ({ title, amount, icon: Icon, gradient, trend, onEdit, actionLabel, onAction }) => {
    return (
        <div className="glass-panel" style={{
            flex: 1,
            minWidth: '280px',
            background: gradient,
            border: 'none',
            color: '#ffffff',
            padding: '1.5rem',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '160px',
            boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
            overflow: 'visible'
        }}>
            {/* Action buttons container */}
            <div style={{
                position: 'absolute',
                top: '0.75rem',
                right: '0.75rem',
                zIndex: 10,
                display: 'flex',
                gap: '0.5rem'
            }}>
                {onAction && (
                    <button
                        onClick={onAction}
                        style={{
                            background: 'rgba(255,255,255,0.25)',
                            border: '1px solid rgba(255,255,255,0.4)',
                            borderRadius: '8px',
                            padding: '4px 10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff',
                            fontSize: '0.7rem',
                            fontWeight: '700',
                            transition: 'background 0.2s ease, transform 0.15s ease',
                            backdropFilter: 'blur(6px)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.45)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)'; e.currentTarget.style.transform = 'scale(1)'; }}
                    >
                        {actionLabel || 'Action'}
                    </button>
                )}

                {onEdit && (
                    <button
                        onClick={onEdit}
                        title="Edit"
                        style={{
                            background: 'rgba(255,255,255,0.25)',
                            border: '1px solid rgba(255,255,255,0.4)',
                            borderRadius: '8px',
                            padding: '5px 8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff',
                            transition: 'background 0.2s ease, transform 0.15s ease',
                            backdropFilter: 'blur(6px)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.45)'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)'; e.currentTarget.style.transform = 'scale(1)'; }}
                    >
                        <Pencil size={13} strokeWidth={2.5} />
                    </button>
                )}
            </div>

            <div style={{ zIndex: 1 }}>
                <div style={{ marginBottom: '0.5rem', paddingRight: (onEdit || onAction) ? '5rem' : '0' }}>
                    <h3 style={{
                        color: 'rgba(255, 255, 255, 0.9)',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                    }}>
                        {title}
                    </h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                    <Icon size={12} color="rgba(255, 255, 255, 0.8)" strokeWidth={3} />
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.8)', fontWeight: '600' }}>This month</span>
                </div>

                <p style={{
                    fontSize: '1.85rem',
                    fontWeight: '800',
                    color: '#ffffff',
                    lineHeight: 1
                }}>
                    {amount !== null ? `₹${amount.toLocaleString()}` : 'None'}
                </p>
            </div>

            {/* Icon Circle */}
            <div style={{
                position: 'absolute',
                right: '1.5rem',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '80px',
                height: '80px',
                background: 'rgba(255, 255, 255, 0.15)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                zIndex: 1
            }}>
                <Icon size={32} color="#ffffff" strokeWidth={1.5} />
            </div>

            {/* Decorative Pulse Circle */}
            <div style={{
                position: 'absolute',
                right: '0rem',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '120px',
                height: '120px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '50%',
                zIndex: 0
            }}></div>
        </div>
    );
};


export default SummaryCard;
