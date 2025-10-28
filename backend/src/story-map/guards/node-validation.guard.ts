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
 * Guard to validate node operations
 * Validates request body before reaching controller
 */
@Injectable()
export class NodeValidationGuard implements CanActivate {
  private readonly logger = new Logger(NodeValidationGuard.name);

  constructor(private validationService: DataValidationService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, path, body, params } = request;

    try {
      // Get teamId from request (could be from body, params, or user context)
      const teamId =
        (body as any)?.teamId ||
        (params as any)?.teamId ||
        (request.user as any)?.teamId;

      if (!teamId) {
        throw new BadRequestException('teamId is required');
      }

      // Validate based on operation
      if (method === 'POST' && path.includes('/nodes')) {
        // Create node
        const validation = await this.validationService.validateNodeCreation(
          teamId,
          body,
        );

        if (!validation.isValid) {
          throw new BadRequestException({
            message: 'Node validation failed',
            errors: validation.errors,
          });
        }
      } else if (method === 'PUT' && path.match(/\/nodes\/[^/]+$/)) {
        // Update node
        const nodeId = (params as any).id;
        const validation = await this.validationService.validateNodeUpdate(
          nodeId,
          teamId,
          body,
        );

        if (!validation.isValid) {
          throw new BadRequestException({
            message: 'Node validation failed',
            errors: validation.errors,
          });
        }
      } else if (method === 'DELETE' && path.match(/\/nodes\/[^/]+$/)) {
        // Delete node
        const nodeId = (params as any).id;
        const validation = await this.validationService.validateNodeDeletion(
          nodeId,
          teamId,
        );

        if (!validation.isValid) {
          throw new BadRequestException({
            message: 'Node validation failed',
            errors: validation.errors,
          });
        }

        // Store warnings for response
        if (validation.warnings.length > 0) {
          (request as any).nodeDeleteWarnings = validation.warnings;
        }
      }

      return true;
    } catch (error) {
      this.logger.error(`Node validation error: ${error}`);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException({
        message: 'Node validation error',
        error: (error as Error).message,
      });
    }
  }
}
