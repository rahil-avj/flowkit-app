import { useEffect, useState } from 'react'

const PUN_CLOSERS: Record<string, string> = {
  'Happy bug hunting 🐛': 'May all bugs fear your cursor.',
  'May the focus be with you': 'And also with your users.',
  "Don't forget to breathe": 'Seriously. Breathe.',
  'Padding: 0; anxiety: 0': "You've got this.",
  'May your clicks be intentional': 'Every tap tells a story.',
  'Type fast, tap faster': "Let's see what they really do.",
  '404: excuses not found': 'Only insights from here.',
  'Ctrl+Z is not a strategy': 'Record first, regret never.',
  'Your UX is showing 💅': 'Own it.',
  'Ship it before you regret it': 'Already recording. Too late to stop.',
  'Keep calm and iterate': 'One session at a time.',
  'The pixels are watching': 'And so are you.',
  'No lorem ipsum was harmed': 'Real content only.',
  'Flex your layout muscles': 'Stretch goal: zero rage clicks.',
  'Grid gang rise up': 'Structure is beauty.',
  'May your margins align': 'In design and in life.',
  'Avoid div soup. Good luck.': 'Semantic elements pray for you.',
  'This session is not a test. Or is it?': 'It absolutely is.',
  'Z-index issues incoming': 'Stay above the fold.',
  'Click things. Break things. Learn things.': 'The holy trinity.',
  'Accessibility? Always.': 'WCAG AA or bust.',
  'One more sprint, they said': 'And here you are. Still sprinting.',
  "Prototype or it didn't happen": 'Documented and recorded.',
  'Stakeholders have entered the chat': 'Stay calm. Record everything.',
  'Design system loading…': 'Components assembling.',
  'Your components are immaculate': "Let's keep them that way.",
  'May your hover states hover': 'And your focus states focus.',
  "Remember: the user is always right. They're just often confused.": "That's why you're here.",
  'Deploy on a Friday, they said': "At least it's being tested first.",
  'It worked in Figma': "Let's see if it works in reality.",
  "Has it blended? Let's find out.": 'Smoothie TBD.',
  'Pixel perfection is a myth. Chase it anyway.': 'Close enough is never close enough.',
  'Responsive by default. Panicked by exception.': 'Breakpoints crossed.',
  'Make it pop — but tastefully': 'No Comic Sans. Please.',
  'The cursor is mightier than the stylus': 'Wield it wisely.',
  'Kerning crimes are being logged': 'Justice will be served.',
  'Is that font licensed? Asking for a friend.': 'Font police offline. Carry on.',
  'Double-click energy only': 'No half measures.',
  'Stay hydrated, ship faster': 'Water first, insights second.',
  'May your loading states be brief': 'Skeleton screens have your back.',
  'The backlog feared you today': 'Ticket closed. Session open.',
  'One component at a time': 'Composability is a virtue.',
  'Mobile first. Desktop surprised.': 'As it should be.',
  "Let's see what the users actually do": 'Spoiler: not what you expected.',
  'Feedback loop initiated 🔁': 'Ready to receive.',
  'Your empathy map led you here': 'Now fill it in for real.',
  "Dark mode or light mode, you're valid either way": 'Respect.',
  'Journey mapping? More like journey running': "Legs don't fail us now.",
  'Test early. Test often. Test now.': "You're doing great.",
  'May your session be full of insights': 'Go get them.',
}

export default function CountdownOverlay({ pun, onDone }: { pun: string; onDone: () => void }) {
  const [count, setCount] = useState(3)

  useEffect(() => {
    if (count === 0) {
      const t = setTimeout(onDone, 1400)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setCount(c => c - 1), 950)
    return () => clearTimeout(t)
  }, [count, onDone])

  const closer = PUN_CLOSERS[pun] ?? 'All the best.'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(0,0,0,0.82)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 32,
      }}
    >
      <div
        key={count}
        style={{
          fontSize: count === 0 ? 56 : 140,
          fontWeight: 900,
          color: '#fff',
          lineHeight: 1,
          letterSpacing: count === 0 ? '-0.01em' : '-0.04em',
          animation: 'countdown-pop 0.38s cubic-bezier(0.34,1.56,0.64,1)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {count === 0 ? closer : count}
      </div>

      {count > 0 && (
        <div style={{ textAlign: 'center', maxWidth: 360, padding: '0 24px' }}>
          <span
            style={{
              fontSize: 36,
              fontWeight: 800,
              fontStyle: 'italic',
              color: '#fff',
              lineHeight: 1.4,
              letterSpacing: '-0.02em',
            }}
          >
            "{pun}"
          </span>
        </div>
      )}

      <style>{`
        @keyframes countdown-pop {
          0% { transform: scale(0.55) translateY(12px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
