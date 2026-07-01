import { nameToColor, nameToInitials } from './avatarUtils'
import { TEAM_MEMBERS } from './teamMembers'

interface Props {
  name: string
  size?: number
}

export default function AuthorAvatar({ name, size = 28 }: Props) {
  const member = TEAM_MEMBERS.find(m => m.name.toLowerCase() === name.toLowerCase())
  const initials = nameToInitials(name)
  const color = nameToColor(name)
  const fontSize = Math.round(size * 0.38)

  if (member?.avatarUrl) {
    return (
      <img
        src={member.avatarUrl}
        alt={name}
        title={name}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0,
        }}
      />
    )
  }

  return (
    <div
      title={name}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      <span style={{ fontSize, fontWeight: 700, color: '#fff', letterSpacing: '0.01em' }}>
        {initials}
      </span>
    </div>
  )
}
