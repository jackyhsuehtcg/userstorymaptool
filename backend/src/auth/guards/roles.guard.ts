import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

/**
 * Metadata key for roles
 */
export const ROLES_KEY = 'roles';

/**
 * Decorator to specify required roles for a route
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Guard to enforce role-based access control
 * Checks for storymap.* roles from TCRT
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if route requires specific roles
    const requiredRoles = this.reflector.get<string[]>(ROLES_KEY, context.getHandler());

    // If no roles specified, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user;

    // Check if user is authenticated
    if (!user) {
      this.logger.warn(`Access denied: user not authenticated`);
      throw new ForbiddenException('Unauthorized');
    }

    // Get user roles from JWT or session
    const userRoles = user.roles || [];

    // Check if user has any of the required roles
    const hasRequiredRole = requiredRoles.some((requiredRole) => {
      // Check for exact match or wildcard match
      if (requiredRole === '*') {
        return true; // Wildcard allows all
      }

      if (requiredRole.endsWith('*')) {
        // Wildcard pattern (e.g., storymap.*)
        const pattern = requiredRole.slice(0, -1);
        return userRoles.some((role: string) => role.startsWith(pattern));
      }

      // Exact match
      return userRoles.includes(requiredRole);
    });

    if (!hasRequiredRole) {
      this.logger.warn(
        `Access denied: user ${user.userId} lacks required roles. Required: ${requiredRoles}, User has: ${userRoles}`,
      );
      throw new ForbiddenException(
        `Insufficient permissions. Required roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
