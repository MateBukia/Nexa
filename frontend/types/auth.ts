export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

export interface AuthSession {
  accessToken: string;
  user: AuthUser;
}
