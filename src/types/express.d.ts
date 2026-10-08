export interface AuthUser {
  id: string;
  role: 'CUSTOMER' | 'TECHNICIAN' | 'ADMIN';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
