import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DataValidationService } from '../services/data-validation.service';
import { Request } from 'express';

/**
 * Guard to validate edge operations
 * Validates cross-edge references and constraints
 */
@Injectable()
export class EdgeValidationGuard implements CanActivate {
  private readonly logger = new Logger(EdgeValidationGuard.name);

  constructor(private validationService: DataValidationService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, path, body, params } = request;

    try {
      // Get teamId from request
      const teamId =
        (body as any)?.teamId ||
        (params as any)?.teamId ||
        (request.user as any)?.teamId;

      if (!teamId) {
        throw new BadRequestException('teamId is required');
      }

      // Validate based on operation
      if (method === 'POST' && path.includes('/edges')) {
        // Create edge
        const validation = await this.validationService.validateEdgeCreation(
          teamId,
          body,
        );

        if (!validation.isValid) {
          throw new BadRequestException({
            message: 'Edge validation failed',
            errors: validation.errors,
          });
        }

        // Additional validation for cross-edges
        if ((body as any).type === 'cross') {
          if (!body.kind) {
            throw new BadRequestException({
              message: 'Edge validation failed',
              errors: ['Cross-edge must specify a kind (e.g., depends-on, blocks)'],
            });
          }

          if (!body.targetTeamId) {
            throw new BadRequestException({
              message: 'Edge validation failed',
              errors: ['Cross-edge must specify targetTeamId'],
            });
          }
        }
      } else if (method === 'DELETE' && path.match(/\/edges\/[^/]+$/)) {
        // Delete edge
        const edgeId = (params as any).id;
        const validation = await this.validationService.validateEdgeDeletion(
          edgeId,
          teamId,
        );

        if (!validation.isValid) {
          throw new BadRequestException({
            message: 'Edge validation failed',
            errors: validation.errors,
          });
        }
      }

      return true;
    } catch (error) {
      this.logger.error(`Edge validation error: ${error}`);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException({
        message: 'Edge validation error',
        error: (error as Error).message,
      });
    }
  }
}
