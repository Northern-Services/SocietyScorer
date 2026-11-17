export const USER_ROLES = {
  SITE_ADMIN: 'SITE_ADMIN',
  UNION_ADMIN: 'UNION_ADMIN',
  DEVELOPER: 'DEVELOPER',
  MEMBER: 'MEMBER'
} as const

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES]

/** Roles that have full administrative access (Site Admin and Developer are equivalent). */
export const ADMIN_ROLES: UserRole[] = [USER_ROLES.SITE_ADMIN, USER_ROLES.DEVELOPER]

/** Check whether a role string is one of the admin roles. */
export const isAdminRole = (role: string | undefined): role is UserRole =>
  ADMIN_ROLES.includes(role as UserRole)

/** Human-readable labels for each role. */
export const ROLE_LABELS: Record<UserRole, string> = {
  [USER_ROLES.SITE_ADMIN]: 'Site Admin',
  [USER_ROLES.UNION_ADMIN]: 'Union Admin',
  [USER_ROLES.DEVELOPER]: 'Developer',
  [USER_ROLES.MEMBER]: 'Member'
}

/** Short descriptions shown in the admin UI. */
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  [USER_ROLES.SITE_ADMIN]: 'Full system access — manage all users, competitions, and site settings.',
  [USER_ROLES.DEVELOPER]: 'Full system access — same permissions as Site Admin.',
  [USER_ROLES.UNION_ADMIN]: 'Union-level administration (coming soon).',
  [USER_ROLES.MEMBER]: 'Standard member — log rounds and view fixtures.'
}

export const DEFAULT_ROLE: UserRole = USER_ROLES.MEMBER
export const FIRST_USER_ROLE: UserRole = USER_ROLES.SITE_ADMIN
