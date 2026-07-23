export const ROLE_NAMES = ['customer', 'admin', 'support_agent'] as const;

export type RoleName = (typeof ROLE_NAMES)[number];

export interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
}
