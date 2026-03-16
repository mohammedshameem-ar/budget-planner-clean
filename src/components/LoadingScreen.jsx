import React from 'react';

const LoadingScreen = ({ message = "LOADING YOUR DATA...", subtext = "PLEASE WAIT A MOMENT" }) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0,
      width: '100vw', height: '100vh',
      background: 'linear-gradient(135deg, #6495ED 0%, #4682B4 100%)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      color: 'white',
      overflow: 'hidden'
    }}>

      {/* Decorative blurred circles */}
      <div style={{
        position: 'absolute', width: '350px', height: '350px',
        background: 'rgba(255,255,255,0.07)', borderRadius: '50%',
        top: '-80px', left: '-80px', pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', width: '250px', height: '250px',
        background: 'rgba(255,255,255,0.07)', borderRadius: '50%',
        bottom: '-60px', right: '-60px', pointerEvents: 'none'
      }} />

      {/* ── App Logo (piggy bank from public/logo.svg) ── */}
      <div style={{
        width: '110px', height: '110px',
        background: 'rgba(255,255,255,0.15)',
        borderRadius: '32px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '1.6rem',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.35)',
        animation: 'logo-pulse 2s ease-in-out infinite'
      }}>
        <img
          src="/logo.svg"
          alt="BudgetWise Logo"
          style={{ width: '70px', height: '70px', objectFit: 'contain' }}
        />
      </div>

      {/* App name */}
      <h1 style={{
        fontFamily: "'Dancing Script', cursive, system-ui",
        fontSize: '2.4rem',
        fontWeight: '700',
        margin: '0 0 0.4rem 0',
        opacity: 0.97,
        letterSpacing: '0.5px',
        textShadow: '0 2px 12px rgba(0,0,0,0.15)'
      }}>BudgetWise</h1>

      <p style={{
        fontSize: '0.75rem',
        opacity: 0.6,
        margin: '0 0 2.4rem 0',
        letterSpacing: '2.5px',
        textTransform: 'uppercase',
        fontWeight: '500'
      }}>Plan Better &bull; Save Smarter</p>

      {/* Slim animated shimmer bar */}
      <div style={{
        width: '200px', height: '3px',
        background: 'rgba(255,255,255,0.2)',
        borderRadius: '10px', overflow: 'hidden',
        marginBottom: '1.4rem'
      }}>
        <div style={{
          height: '100%', width: '70px',
          background: 'white',
          borderRadius: '10px',
          animation: 'ls-ping 1.3s ease-in-out infinite'
        }} />
      </div>

      <style>{`
        @keyframes ls-ping {
          0%   { transform: translateX(-70px); opacity: 0.6; }
          50%  { opacity: 1; }
          100% { transform: translateX(200px); opacity: 0.6; }
        }
        @keyframes logo-pulse {
          0%, 100% { box-shadow: 0 8px 32px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.35); transform: scale(1); }
          50%       { box-shadow: 0 8px 48px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.35); transform: scale(1.04); }
        }
        .ls-msg { font-size: 0.75rem; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; opacity: 0.72; margin: 0; }
      `}</style>

      <p className="ls-msg">{message}</p>
    </div>
  );
};

export default LoadingScreen;
