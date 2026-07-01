/**
 * Shown while a lazy screen chunk is loading (Suspense fallback).
 * Fills the device shell content area with a neutral pulse — no layout shift.
 */
export default function ScreenSkeleton() {
  return (
    <div
      className="size-full"
      style={{
        background: 'var(--color-bg-surface, #1a1f2e)',
        animation: 'sk-pulse 1.4s ease-in-out infinite',
      }}
      aria-hidden="true"
    >
      <style>{`
        @keyframes sk-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes sk-pulse { 0%, 100% { opacity: 1; } }
        }
      `}</style>
    </div>
  )
}
