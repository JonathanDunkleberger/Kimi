interface KimiLogoProps {
  size?: number;
  className?: string;
}

export function KimiLogo({ size = 32, className = '' }: KimiLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Green rounded square background */}
      <rect width="32" height="32" rx="7" fill="#00e5a0" />
      {/* White K letter */}
      <text
        x="16"
        y="23"
        textAnchor="middle"
        fontFamily="'Manrope', 'Inter', system-ui, sans-serif"
        fontSize="22"
        fontWeight="800"
        fill="white"
      >
        K
      </text>
    </svg>
  );
}
