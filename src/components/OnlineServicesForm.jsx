import React, { useState } from 'react';
import { useBudget } from '../context/BudgetContext';
import Modal from './Modal';
import { Search, ChevronRight } from 'lucide-react';
import swiggyLogo from '../assets/Swiggy-logo.png';
import zomatoLogo from '../assets/zomato.png';
import eatsureLogo from '../assets/eatsure.png';
import uberLogo from '../assets/uber.png';
import olaLogo from '../assets/ola.png';
import rapidoLogo from '../assets/Rapido.png';
import amazonLogo from '../assets/amazon.png';
import flipkartLogo from '../assets/flipkart.png';
import meeshoLogo from '../assets/Meesho.png';
import shopsyLogo from '../assets/Shopsy.png';
import netflixLogo from '../assets/netflix.png';
import spotifyLogo from '../assets/Spotify.png';
import primeLogo from '../assets/amazonprimevideo.png';

export const ONLINE_SERVICES = [
    // Food Delivery
    { id: 'swiggy', name: 'Swiggy', category: 'food', icon: '🍔', logo: swiggyLogo, color: '#fc8019' },
    { id: 'zomato', name: 'Zomato', category: 'food', icon: '🍲', logo: zomatoLogo, color: '#e23744' },
    { id: 'eatsure', name: 'EatSure', category: 'food', icon: '🍕', logo: eatsureLogo, color: '#5b2488' },
    // Transport
    { id: 'uber', name: 'Uber', category: 'transport', icon: '🚘', logo: uberLogo, color: '#000000' },
    { id: 'ola', name: 'Ola', category: 'transport', icon: '🚕', logo: olaLogo, color: '#cddc39' },
    { id: 'rapido', name: 'Rapido', category: 'transport', icon: '🏍️', logo: rapidoLogo, color: '#f9c936' },
    // Shopping
    { id: 'amazon', name: 'Amazon', category: 'shopping', icon: '🛒', logo: amazonLogo, color: '#ff9900' },
    { id: 'flipkart', name: 'Flipkart', category: 'shopping', icon: '🛍️', logo: flipkartLogo, color: '#2874f0' },
    { id: 'meesho', name: 'Meesho', category: 'shopping', icon: '📦', logo: meeshoLogo, color: '#f43397' },
    { id: 'shopsy', name: 'Shopsy', category: 'shopping', icon: '👗', logo: shopsyLogo, color: '#ffcc00' },
    // Entertainment
    { id: 'netflix', name: 'Netflix', category: 'entertainment', icon: '🎬', logo: netflixLogo, color: '#e50914' },
    { id: 'spotify', name: 'Spotify', category: 'entertainment', icon: '🎵', logo: spotifyLogo, color: '#1db954' },
    { id: 'prime', name: 'Amazon Prime Video', category: 'entertainment', icon: '🍿', logo: primeLogo, color: '#00a8e1' }
];

const OnlineServicesForm = ({ onClose }) => {
    const { addTransaction } = useBudget();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedService, setSelectedService] = useState(null);
    const [amount, setAmount] = useState('');

    const filteredServices = ONLINE_SERVICES.filter(service =>
        service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const evaluateExpression = (expression) => {
        try {
            const sanitized = expression.replace(/[^0-9+\-*/.()\s]/g, '');
            if (!sanitized) return '';
            // eslint-disable-next-line no-new-func
            const result = new Function('return ' + sanitized)();
            return isFinite(result) ? parseFloat(result.toFixed(2)).toString() : '';
        } catch (error) {
            return expression;
        }
    };

    const handleAmountBlur = () => {
        if (amount) {
            const calculated = evaluateExpression(amount);
            setAmount(calculated);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!amount || !selectedService) return;

        addTransaction({
            amount: parseFloat(amount),
            type: 'expense',
            category: selectedService.category,
            date: new Date().toLocaleDateString('en-CA'),
            note: `${selectedService.icon} ${selectedService.name}`,
            logo: selectedService.logo
        });
        onClose();
    };

    if (selectedService) {
        return (
            <Modal title={`Add to ${selectedService.name}`} onClose={onClose}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '1rem',
                        padding: '1rem', background: 'var(--surface-light)',
                        borderRadius: '12px', border: '1px solid var(--glass-stroke)'
                    }}>
                        <div style={{
                            width: '48px', height: '48px',
                            background: selectedService.color,
                            borderRadius: '12px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.5rem',
                            boxShadow: `0 4px 12px ${selectedService.color}40`,
                            overflow: 'hidden'
                        }}>
                            {selectedService.logo ? (
                                <img src={selectedService.logo} alt={selectedService.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                            ) : null}
                            <span style={{ display: selectedService.logo ? 'none' : 'block' }}>{selectedService.icon}</span>
                        </div>
                        <div>
                            <p style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--text-main)' }}>{selectedService.name}</p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                                Category: {selectedService.category}
                            </p>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.8rem', fontSize: '0.95rem', fontWeight: '600' }}>
                            Amount <span style={{ color: 'var(--primary)', fontSize: '0.8rem', fontWeight: '400' }}>(allows calculation e.g. 150+50)</span>
                        </label>
                        <input
                            type="text"
                            inputMode="decimal"
                            autoFocus
                            required
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            onBlur={handleAmountBlur}
                            placeholder="0.00"
                            style={{ width: '100%', fontSize: '1.25rem', padding: '1rem' }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                        <button type="button" onClick={() => setSelectedService(null)} className="btn" style={{
                            flex: 1,
                            background: 'var(--surface-light)',
                            border: '1.5px solid var(--glass-stroke)',
                            justifyContent: 'center'
                        }}>
                            Back
                        </button>
                        <button type="submit" className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }}>
                            Add Expense
                        </button>
                    </div>
                </form>
            </Modal>
        );
    }

    return (
        <Modal title="Online Services" onClose={onClose}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
                <div style={{ position: 'relative' }}>
                    <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                    <input
                        type="text"
                        placeholder="Search services..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                            borderRadius: '12px',
                            border: '1px solid var(--glass-border)',
                            background: 'var(--surface-light)',
                            fontSize: '0.9rem',
                            color: 'var(--text-main)',
                            outline: 'none'
                        }}
                    />
                </div>

                <div className="custom-scrollbar" style={{
                    display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '0.75rem',
                    overflowY: 'auto', maxHeight: '60vh', paddingRight: '0.5rem', paddingBottom: '1rem'
                }}>
                    {Object.entries(
                        filteredServices.reduce((acc, curr) => {
                            if (!acc[curr.category]) acc[curr.category] = [];
                            acc[curr.category].push(curr);
                            return acc;
                        }, {})
                    ).map(([category, services]) => (
                        <div key={category} style={{ marginBottom: '0.5rem' }}>
                            <p style={{
                                fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)',
                                textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem',
                                marginLeft: '0.25rem'
                            }}>
                                {category}
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {services.map(service => (
                                    <button
                                        key={service.id}
                                        onClick={() => setSelectedService(service)}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '0.75rem 1rem',
                                            background: 'var(--surface-light)',
                                            border: '1px solid var(--glass-stroke)',
                                            borderRadius: '12px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            textAlign: 'left'
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                                            e.currentTarget.style.borderColor = 'var(--primary)';
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.transform = '';
                                            e.currentTarget.style.boxShadow = '';
                                            e.currentTarget.style.borderColor = 'var(--glass-stroke)';
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{
                                                width: '36px', height: '36px',
                                                background: service.color,
                                                borderRadius: '10px',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '1.1rem',
                                                boxShadow: `0 2px 8px ${service.color}40`,
                                                overflow: 'hidden'
                                            }}>
                                                {service.logo ? (
                                                    <img src={service.logo} alt={service.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                                                ) : null}
                                                <span style={{ display: service.logo ? 'none' : 'block' }}>{service.icon}</span>
                                            </div>
                                            <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{service.name}</span>
                                        </div>
                                        <ChevronRight size={18} color="var(--text-muted)" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                    {filteredServices.length === 0 && (
                        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>
                            No services found matching "{searchTerm}"
                        </p>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default OnlineServicesForm;
