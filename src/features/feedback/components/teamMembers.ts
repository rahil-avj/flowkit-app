export interface TeamMember {
  name: string
  role?: string
  avatarUrl?: string
}

// Add team members here. avatarUrl is optional — falls back to initials avatar.
export const TEAM_MEMBERS: TeamMember[] = [
  { name: 'Alen Walker', role: 'Operations Consultant' },
  { name: 'Adam Smith', role: 'Customer Success' },
  { name: 'Jhon Smit', role: 'Product Owner' },
  { name: 'David William', role: 'UX Designer' },
]
