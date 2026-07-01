import React from 'react'

export default function Kbd({ children, style, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className="inline-flex items-center px-1 py-0.5 rounded-[4px] text-[9px] font-semibold bg-theme-hover text-theme-text-secondary border border-theme-border shadow-[0_1px_0_rgba(0,0,0,0.15)] font-mono leading-none"
      style={style}
      {...props}
    >
      {children}
    </kbd>
  )
}
