interface HowToPlayListProps {
  steps: string[]
}

export default function HowToPlayList({ steps }: HowToPlayListProps) {
  return (
    <ol className="flex flex-col gap-2">
      {steps.map((step, index) => (
        <li key={index} className="flex gap-2 items-start">
          <span className="shrink-0 size-5 rounded-full bg-theme-blue-dim text-theme-blue text-ui-2xs font-bold flex items-center justify-center">
            {index + 1}
          </span>
          <span className="text-ui-sm text-theme-text-secondary">{step}</span>
        </li>
      ))}
    </ol>
  )
}
