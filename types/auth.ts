export type UserRole = 'chief' | 'admin' | 'verifier' | 'viewer'

export interface AppUser {
  id: string
  name: string
  email: string
  role: UserRole
  caste_id: string | null
  is_active: boolean
}

export const ROLE_REDIRECTS: Record<UserRole, string> = {
  chief: '/dashboard',
  admin: '/dashboard',
  verifier: '/households',
  viewer: '/households',
}

export const PROTECTED_ROUTES: Record<string, UserRole[]> = {
  '/dashboard': ['chief', 'admin'],
  '/households': ['chief', 'admin', 'verifier', 'viewer'],
  '/import': ['chief', 'admin'],
  '/reports': ['chief', 'admin', 'verifier'],
  '/users': ['chief', 'admin'],
  '/directory': ['chief', 'admin'],
  '/corrections': ['chief', 'admin'],
  '/subcaste': ['chief', 'admin'],
  '/settings': ['chief'],
}
