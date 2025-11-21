import { UserRole, UserStatus } from '../types/prisma-types';

/**
 * Interface representing the authenticated user in request context
 * Populated by JWT strategy and available via @CurrentUser() decorator
 */
export interface ICurrentUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  organizationId: string;
}
