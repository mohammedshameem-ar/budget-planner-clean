const Logo = ({ size = 32, iconOnly = false }) => {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <svg
                width={size}
                height={size}
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="animate-pulse-slow"
            >
                {/* Outer Ring */}
                <circle cx="16" cy="16" r="14" stroke="url(#logo-gradient)" strokeWidth="2.5" opacity="0.4" />

                {/* Shield/Wallet Base */}
                <path
                    d="M16 4C10 4 6 7 6 12C6 17 9 22 16 28C23 22 26 17 26 12C26 7 22 4 16 4Z"
                    fill="url(#logo-gradient)"
                    fillOpacity="0.25"
                />

                {/* Main Icon Path - Stylized 'W' for Wise/Wallet */}
                <path
                    d="M10 12L13 20L16 15L19 20L22 12"
                    stroke="var(--primary)"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* Floating Coin Dot */}
                <circle cx="16" cy="8" r="3" fill="var(--secondary)" stroke="var(--primary)" strokeWidth="1" />

                <defs>
                    <linearGradient id="logo-gradient" x1="6" y1="4" x2="26" y2="28" gradientUnits="userSpaceOnUse">
                        <stop stopColor="var(--primary)" />
                        <stop offset="1" stopColor="var(--secondary)" />
                    </linearGradient>
                </defs>
            </svg>
            {!iconOnly && (
                <h2 className="text-gradient" style={{
                    fontSize: size === 32 ? '1.25rem' : '1.125rem',
                    fontWeight: '800',
                    letterSpacing: '-0.025em'
                }}>
                    BudgetWise
                </h2>
            )}
        </div>
    );
};

export default Logo;
