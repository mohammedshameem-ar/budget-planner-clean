import React, { useMemo } from 'react';
import { useBudget } from '../context/BudgetContext';
import { Shield, Sword, Trophy, Medal, Star, Crown, Zap, Flame, Award, User } from 'lucide-react';
import './Points.css';

const RANKS = [
    { id: 1, name: 'Guard', icon: Shield, color: '#94a3b8', points: 0, batch: 1, index: 0 },
    { id: 2, name: 'Soldier', icon: Sword, color: '#64748b', points: 500, batch: 1, index: 1 },
    { id: 3, name: 'Gladiator', icon: Flame, color: '#f97316', points: 1500, batch: 1, index: 2 },
    { id: 4, name: 'Knight', icon: Shield, color: '#eab308', points: 3000, batch: 2, index: 0 },
    { id: 5, name: 'Warrior', icon: Sword, color: '#ef4444', points: 5000, batch: 2, index: 1 },
    { id: 6, name: 'Champion', icon: Trophy, color: '#8b5cf6', points: 8000, batch: 2, index: 2 },
    { id: 7, name: 'Warlord', icon: Medal, color: '#1e293b', points: 12000, batch: 3, index: 0 },
    { id: 8, name: 'Commander', icon: Star, color: '#3b82f6', points: 18000, batch: 3, index: 1 },
    { id: 9, name: 'General', icon: Crown, color: '#10b981', points: 25000, batch: 3, index: 2 },
];

const Points = () => {
    const { points, level } = useBudget();

    const currentRank = useMemo(() => {
        return RANKS[level - 1] || RANKS[0];
    }, [level]);

    const nextRank = useMemo(() => {
        return RANKS[level] || null;
    }, [level]);

    const progress = useMemo(() => {
        if (!nextRank) return 100;
        const currentRankPoints = currentRank.points;
        const nextRankPoints = nextRank.points;
        const totalNeeded = nextRankPoints - currentRankPoints;
        const earned = points - currentRankPoints;
        return Math.min(Math.max((earned / totalNeeded) * 100, 0), 100);
    }, [points, currentRank, nextRank]);

    return (
        <div className="points-container animate-fade-in">
            <header className="points-header glass-panel">
                <div className="current-status">
                    <div className="rank-badge-main" style={{ '--rank-color': currentRank.color }}>
                        <div className={`rank-emblem emblems-batch-${currentRank.batch} emblem-idx-${currentRank.index}`}></div>
                    </div>
                    <div className="status-info">
                        <h1>{currentRank.name}</h1>
                        <currentRank.icon size={18} color={currentRank.color} style={{ marginRight: '0.5rem' }} />
                        <span className="subtitle">Level {level} • Financial Warrior</span>
                        <div className="points-display">
                            <span className="points-value">{points.toLocaleString()}</span>
                            <span className="points-label">Total Points</span>
                        </div>
                    </div>
                </div>

                {nextRank && (
                    <div className="next-level-card">
                        <div className="flex-between">
                            <span>Next: {nextRank.name}</span>
                            <span>{nextRank.points - points} pts left</span>
                        </div>
                        <div className="progress-bar-container">
                            <div className="progress-bar" style={{ width: `${progress}%`, backgroundColor: nextRank.color }}></div>
                        </div>
                    </div>
                )}
            </header>

            <div className="roadmap-container">
                <div className="game-map">
                    <div className="map-grass"></div>
                    
                    {/* Decorative Elements */}
                    <div className="map-decoration tree-1"><Star size={20} fill="#166534" color="#064e3b" /></div>
                    <div className="map-decoration tree-2"><Star size={24} fill="#166534" color="#064e3b" /></div>
                    <div className="map-decoration rock-1"><Award size={30} color="#475569" /></div>
                    <div className="map-decoration camp"><Zap size={40} fill="#f97316" color="#7c2d12" /></div>

                    <div className="roadmap-winding-path">
                        {RANKS.map((rank, idx) => {
                            const isUnlocked = level >= rank.id;
                            const isCurrent = level === rank.id;
                            const isEven = idx % 2 === 0;
                            
                            return (
                                <div 
                                    key={rank.id} 
                                    className={`map-node ${isUnlocked ? 'unlocked' : 'locked'} ${isCurrent ? 'current' : ''} ${isEven ? 'pos-left' : 'pos-right'}`}
                                    style={{ '--node-color': rank.color }}
                                >
                                    <div className="node-wrapper">
                                        {isCurrent && (
                                            <div className="user-avatar-float animate-bounce-subtle">
                                                <div className="avatar-square">
                                                    <User size={32} color="#fff" fill="#000" />
                                                    <div className="status-heart">❤️</div>
                                                </div>
                                                <div className="avatar-pointer"></div>
                                            </div>
                                        )}

                                        <div className="diamond-node">
                                            <div className="diamond-content">
                                                {isUnlocked ? (
                                                    <div className={`rank-emblem emblems-batch-${rank.batch} emblem-idx-${rank.index}`}></div>
                                                ) : (
                                                    <div className="locked-emblem">
                                                        <rank.icon size={32} />
                                                    </div>
                                                )}
                                                <div className="diamond-level-badge">{rank.id}</div>
                                            </div>
                                        </div>

                                        <div className="node-stars">
                                            {[1, 2, 3].map(s => (
                                                <Star 
                                                    key={s} 
                                                    size={16} 
                                                    fill={isUnlocked ? "#ffd700" : "#4b5563"} 
                                                    color={isUnlocked ? "#b45309" : "#1f2937"} 
                                                    className={`star-${s}`}
                                                />
                                            ))}
                                        </div>

                                        <div className="node-info-bubble">
                                            <h3>{rank.name}</h3>
                                            <span>{rank.points.toLocaleString()} PTS</span>
                                        </div>
                                    </div>
                                    
                                    {idx < RANKS.length - 1 && (
                                        <div className={`map-path-connector ${isUnlocked && level > rank.id ? 'active' : ''}`}></div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Points;
