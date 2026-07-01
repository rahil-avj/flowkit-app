interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  color?: string
}

export default function Spinner({ size = 'md', color }: SpinnerProps) {
  const dimensions = {
    sm: 12,
    md: 18,
    lg: 28,
  }[size]

  const strokeWidth = {
    sm: 2,
    md: 2.5,
    lg: 3,
  }[size]

  const spinnerColor = color || 'var(--color-theme-blue)'

  return (
    <div className="inline-flex animate-[spin_0.8s_linear_infinite]">
      <svg width={dimensions} height={dimensions} viewBox="0 0 50 50">
        <circle
          cx="25"
          cy="25"
          r="20"
          fill="none"
          stroke="var(--color-theme-border)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx="25"
          cy="25"
          r="20"
          fill="none"
          stroke={spinnerColor}
          strokeWidth={strokeWidth}
          strokeDasharray="80"
          strokeDashoffset="30"
          strokeLinecap="round"
        />
      </svg>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
