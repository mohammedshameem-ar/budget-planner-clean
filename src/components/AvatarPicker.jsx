import React, { useState } from 'react';
import { useBudget } from '../context/BudgetContext';
import { useAuth } from '../context/AuthContext';
import { Check, User, Users, Sparkles, ImageIcon } from 'lucide-react';
import Modal from './Modal';

import wolverineImg from '../assets/Avatars/heros/Marvel-Wolverine-avatar.png';
import batmanImg from '../assets/Avatars/heros/batman.png';
import deadpoolImg from '../assets/Avatars/heros/deadpool.png';
import ironmanImg from '../assets/Avatars/heros/ironman.png';
import spidermanImg from '../assets/Avatars/heros/spiderman.png';
import thorImg from '../assets/Avatars/heros/thor.png';

// ─── Local Avatar Assets — Curated Selection ───────────────────
const menAvatars = [
    { id: 'man-2', url: '/avatars/custom/man-smiling-1.jpg',   label: 'Friendly Smile' },
    { id: 'man-3', url: '/avatars/custom/man-smiling-2.jpg',   label: 'Bright Look' },
    { id: 'man-4', url: '/avatars/custom/hero-captain.png',    label: 'Heroic Spirit' },
    { id: 'hero-wolverine', url: wolverineImg, label: 'Wolverine' },
    { id: 'hero-batman',    url: batmanImg,    label: 'Batman' },
    { id: 'hero-deadpool',  url: deadpoolImg,  label: 'Deadpool' },
    { id: 'hero-ironman',   url: ironmanImg,   label: 'Iron Man' },
    { id: 'hero-spiderman', url: spidermanImg, label: 'Spider-Man' },
    { id: 'hero-thor',      url: thorImg,      label: 'Thor' },
];

const womenAvatars = [
    { id: 'woman-1', url: '/avatars/custom/woman-braided.jpg',     label: 'Braided Style' },
    { id: 'woman-2', url: '/avatars/custom/woman-dark-hair.jpg',   label: 'Elegant Dark' },
    { id: 'woman-3', url: '/avatars/custom/woman-denim.jpg',       label: 'Denim Look' },
    { id: 'woman-6', url: '/avatars/custom/hero-black-widow.png',  label: 'Noble Spirit' },
    { id: 'woman-7', url: '/avatars/custom/hero-wonder-woman.png', label: 'Goddess Grace' },
];

const avatarGroups = {
    Men:   menAvatars,
    Women: womenAvatars,
};

const AvatarPicker = () => {
    const { avatar, updateAvatar, isAvatarPickerOpen, toggleAvatarPicker } = useBudget();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('Men');

    const tabs = [
        { id: 'Men',   icon: User,  label: 'Men'   },
        { id: 'Women', icon: Users, label: 'Women' },
    ];

    const currentAvatars = avatarGroups[activeTab];

    if (!isAvatarPickerOpen) return null;

    return (
        <Modal isOpen={isAvatarPickerOpen} onClose={() => toggleAvatarPicker(false)}>
            <div className="avatar-picker-container">

                {/* ── Header ── */}
                <div className="avatar-picker-header">
                    <div>
                        <h2 className="avatar-picker-title">
                            <div className="avatar-icon-wrapper">
                                <Sparkles size={20} />
                            </div>
                            Select Avatar
                        </h2>
                        <p className="avatar-picker-subtitle">
                            Refined, high-quality local illustrated portraits
                        </p>
                    </div>
                </div>

                {/* ── Tabs ── */}
                <div className="avatar-tabs-container">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`avatar-tab-button ${activeTab === tab.id ? 'active' : ''}`}
                        >
                            <tab.icon size={18} />
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* ── Avatar Grid ── */}
                <div className="avatar-grid">
                    {/* Default Option */}
                    <button
                        onClick={() => {
                            updateAvatar('default');
                            setTimeout(() => toggleAvatarPicker(false), 200);
                        }}
                        className={`avatar-item-btn ${avatar === 'default' ? 'selected' : ''}`}
                    >
                        <div className="avatar-img-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary)', color: 'white', fontSize: '2.5rem', fontWeight: 'bold' }}>
                            {(user?.name?.charAt(0) || user?.email?.charAt(0) || '?').toUpperCase()}
                        </div>
                        <div className="avatar-info">
                            <span className="avatar-label">Default (Initials)</span>
                        </div>
                    </button>

                    {currentAvatars.map(({ id, url, label }) => {
                        const isSelected = avatar === url;
                        return (
                            <button
                                key={id}
                                onClick={() => {
                                    updateAvatar(url);
                                    // Small delay for visual feedback before closing
                                    setTimeout(() => toggleAvatarPicker(false), 200);
                                }}
                                className={`avatar-item-btn ${isSelected ? 'selected' : ''}`}
                            >
                                <div className="avatar-img-wrapper">
                                    <img
                                        src={url}
                                        alt={label}
                                        className="avatar-img"
                                        loading="lazy"
                                    />
                                </div>

                                {/* Selected badge */}
                                {isSelected && (
                                    <div className="avatar-selected-badge">
                                        <Check size={18} strokeWidth={3.5} />
                                    </div>
                                )}

                                {/* Label */}
                                <p className="avatar-label">{label}</p>
                            </button>
                        );
                    })}
                </div>

                {/* ── Footer ── */}
                <div className="avatar-picker-footer">
                    <p className="avatar-footer-text">
                        <ImageIcon size={18} color="var(--primary)" />
                        Locally stored for lightning-fast loading
                    </p>
                </div>
            </div>
        </Modal>
    );
};

export default AvatarPicker;
