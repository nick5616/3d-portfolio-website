// Flat, faceted rupee for 2D UI (counter, prompts, landing).
export const RupeeGlyph: React.FC<{
    color?: string;
    size?: number;
    className?: string;
}> = ({ color = "#3ee58f", size = 22, className }) => {
    const id = `rg-${color.replace("#", "")}`;
    return (
        <svg
            className={className}
            width={size * 0.55}
            height={size}
            viewBox="0 0 22 40"
            aria-hidden
        >
            <defs>
                <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
                    <stop offset="0.35" stopColor={color} />
                    <stop offset="1" stopColor={color} stopOpacity="0.55" />
                </linearGradient>
            </defs>
            <polygon points="11,0 22,10 22,30 11,40 0,30 0,10" fill={`url(#${id})`} />
            <polygon points="11,7 16,12 16,28 11,33 6,28 6,12" fill="rgba(255,255,255,0.3)" />
            <polygon points="11,0 22,10 11,7" fill="rgba(255,255,255,0.45)" />
            <polygon points="0,30 11,40 11,33 6,28" fill="rgba(0,0,0,0.18)" />
        </svg>
    );
};
