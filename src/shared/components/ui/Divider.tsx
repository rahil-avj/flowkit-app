import React from 'react'

interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string
}

export default function Divider({ label, style, ...props }: DividerProps) {
  if (!label) {
    return (
      <hr
        className="border-none h-px bg-theme-border my-3 w-full"
        style={style}
        {...(props as React.HTMLAttributes<HTMLHRElement>)}
      />
    )
  }

  return (
    <div className="flex items-center text-center my-3 w-full" style={style} {...props}>
      <div className="flex-1 h-px bg-theme-border" />
      <span className="px-2 text-[9px] font-bold text-theme-text-muted uppercase tracking-wider">
        {label}
      </span>
      <div className="flex-1 h-px bg-theme-border" />
    </div>
  )
}
