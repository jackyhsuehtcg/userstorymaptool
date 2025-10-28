import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';

export enum AuditAction {
  // Authentication
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  TOKEN_REFRESH = 'TOKEN_REFRESH',
  SESSION_EXPIRED = 'SESSION_EXPIRED',

  // Node operations
  NODE_CREATE = 'NODE_CREATE',
  NODE_UPDATE = 'NODE_UPDATE',
  NODE_DELETE = 'NODE_DELETE',

  // Edge operations
  EDGE_CREATE = 'EDGE_CREATE',
  EDGE_UPDATE = 'EDGE_UPDATE',
  EDGE_DELETE = 'EDGE_DELETE',

  // Import/Export
  IMPORT_START = 'IMPORT_START',
  IMPORT_COMPLETE = 'IMPORT_COMPLETE',
  IMPORT_FAILED = 'IMPORT_FAILED',
  EXPORT = 'EXPORT',

  // API Token
  TOKEN_CREATE = 'TOKEN_CREATE',
  TOKEN_REVOKE = 'TOKEN_REVOKE',
  TOKEN_ROTATE = 'TOKEN_ROTATE',

  // Team operations
  TEAM_SYNC = 'TEAM_SYNC',
  TEAM_SYNC_FAILED = 'TEAM_SYNC_FAILED',

  // Permission/Role
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  ROLE_CHANGE = 'ROLE_CHANGE',

  // System
  SYSTEM_ERROR = 'SYSTEM_ERROR',
}

export enum AuditStatus {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  PARTIAL = 'PARTIAL',
}

export enum AuditSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

interface AuditLogEntry {
  _id?: string;
  action: AuditAction;
  resourceType: string; // 'node', 'edge', 'team', etc.
  resourceId: string;
  userId: string;
  teamId?: string;
  ipAddress: string;
  userAgent: string;
  status: AuditStatus;
  severity: AuditSeverity;
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  message: string;
  maskedFields: string[];
  errorDetails?: string;
  createdAt: Date;
}

/**
 * Service for audit logging
 * Records all important operations for compliance and debugging
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectModel('AuditLog') private auditLogModel: Model<AuditLogEntry>,
    private configService: ConfigService,
  ) {}

  /**
   * Log an audit event
   */
  async log(
    action: AuditAction,
    resourceType: string,
    resourceId: string,
    userId: string,
    ipAddress: string,
    userAgent: string,
    options?: {
      teamId?: string;
      status?: AuditStatus;
      severity?: AuditSeverity;
      changes?: Array<{ field: string; oldValue: any; newValue: any }>;
      message?: string;
      maskedFields?: string[];
      errorDetails?: string;
    },
  ): Promise<AuditLogEntry> {
    try {
      const entry = new this.auditLogModel({
        action,
        resourceType,
        resourceId,
        userId,
        teamId: options?.teamId,
        ipAddress,
        userAgent,
        status: options?.status || AuditStatus.SUCCESS,
        severity: options?.severity || this.determineSeverity(action),
        changes: options?.changes,
        message: options?.message || `${action} on ${resourceType}`,
        maskedFields: options?.maskedFields || [],
        errorDetails: options?.errorDetails,
        createdAt: new Date(),
      });

      const savedEntry = await entry.save();
      this.logger.debug(
        `Audit log created: ${action} on ${resourceType} ${resourceId} by user ${userId}`,
      );

      return this.toAuditLogEntry(savedEntry);
    } catch (error) {
      this.logger.error(
        `Failed to save audit log: ${(error as Error).message}`,
      );
      // Don't throw - audit failures shouldn't break main flow
      return null as any;
    }
  }

  /**
   * Log authentication event
   */
  async logAuthentication(
    action: AuditAction,
    userId: string,
    ipAddress: string,
    userAgent: string,
    status: AuditStatus = AuditStatus.SUCCESS,
    errorDetails?: string,
  ): Promise<AuditLogEntry> {
    return this.log(
      action,
      'user',
      userId,
      userId,
      ipAddress,
      userAgent,
      {
        status,
        severity: status === AuditStatus.FAILURE ? AuditSeverity.HIGH : AuditSeverity.MEDIUM,
        errorDetails,
        message: `User authentication: ${action}`,
      },
    );
  }

  /**
   * Log node operation
   */
  async logNodeOperation(
    action: AuditAction,
    nodeId: string,
    teamId: string,
    userId: string,
    ipAddress: string,
    userAgent: string,
    options?: {
      changes?: Array<{ field: string; oldValue: any; newValue: any }>;
      message?: string;
    },
  ): Promise<AuditLogEntry> {
    return this.log(
      action,
      'node',
      nodeId,
      userId,
      ipAddress,
      userAgent,
      {
        teamId,
        severity: AuditSeverity.MEDIUM,
        ...options,
      },
    );
  }

  /**
   * Log edge operation
   */
  async logEdgeOperation(
    action: AuditAction,
    edgeId: string,
    teamId: string,
    userId: string,
    ipAddress: string,
    userAgent: string,
    options?: {
      changes?: Array<{ field: string; oldValue: any; newValue: any }>;
      message?: string;
    },
  ): Promise<AuditLogEntry> {
    return this.log(
      action,
      'edge',
      edgeId,
      userId,
      ipAddress,
      userAgent,
      {
        teamId,
        severity: AuditSeverity.MEDIUM,
        ...options,
      },
    );
  }

  /**
   * Log import operation
   */
  async logImport(
    userId: string,
    teamId: string,
    ipAddress: string,
    userAgent: string,
    status: AuditStatus,
    details?: {
      nodeCount?: number;
      edgeCount?: number;
      errorCount?: number;
      errorDetails?: string;
    },
  ): Promise<AuditLogEntry> {
    return this.log(
      status === AuditStatus.SUCCESS ? AuditAction.IMPORT_COMPLETE : AuditAction.IMPORT_FAILED,
      'import',
      teamId,
      userId,
      ipAddress,
      userAgent,
      {
        teamId,
        status,
        severity: status === AuditStatus.FAILURE ? AuditSeverity.HIGH : AuditSeverity.MEDIUM,
        message: `Data import ${status === AuditStatus.SUCCESS ? 'completed' : 'failed'}: ${details?.nodeCount || 0} nodes, ${details?.edgeCount || 0} edges`,
        errorDetails: details?.errorDetails,
      },
    );
  }

  /**
   * Log API token operation
   */
  async logTokenOperation(
    action: AuditAction,
    tokenId: string,
    userId: string,
    ipAddress: string,
    userAgent: string,
    message?: string,
  ): Promise<AuditLogEntry> {
    return this.log(
      action,
      'api-token',
      tokenId,
      userId,
      ipAddress,
      userAgent,
      {
        severity: AuditSeverity.HIGH,
        maskedFields: ['tokenHash'],
        message: message || `Token operation: ${action}`,
      },
    );
  }

  /**
   * Log permission denied event
   */
  async logPermissionDenied(
    userId: string,
    action: string,
    resource: string,
    ipAddress: string,
    userAgent: string,
    reason: string,
  ): Promise<AuditLogEntry> {
    return this.log(
      AuditAction.PERMISSION_DENIED,
      resource,
      resource,
      userId,
      ipAddress,
      userAgent,
      {
        status: AuditStatus.FAILURE,
        severity: AuditSeverity.HIGH,
        message: `Permission denied: ${reason}`,
      },
    );
  }

  /**
   * Retrieve audit logs with filters
   */
  async getLogs(
    filters?: {
      userId?: string;
      teamId?: string;
      action?: AuditAction;
      resourceType?: string;
      startDate?: Date;
      endDate?: Date;
      status?: AuditStatus;
      limit?: number;
      skip?: number;
    },
  ): Promise<{ logs: AuditLogEntry[]; total: number }> {
    try {
      const query: Record<string, any> = {};

      if (filters?.userId) {
        query.userId = filters.userId;
      }

      if (filters?.teamId) {
        query.teamId = filters.teamId;
      }

      if (filters?.action) {
        query.action = filters.action;
      }

      if (filters?.resourceType) {
        query.resourceType = filters.resourceType;
      }

      if (filters?.status) {
        query.status = filters.status;
      }

      if (filters?.startDate || filters?.endDate) {
        query.createdAt = {};
        if (filters.startDate) {
          query.createdAt.$gte = filters.startDate;
        }
        if (filters.endDate) {
          query.createdAt.$lte = filters.endDate;
        }
      }

      const total = await this.auditLogModel.countDocuments(query);
      const logs = await this.auditLogModel
        .find(query)
        .sort({ createdAt: -1 })
        .limit(filters?.limit || 100)
        .skip(filters?.skip || 0)
        .lean();

      return {
        logs: logs.map((l) => this.toAuditLogEntry(l)),
        total,
      };
    } catch (error) {
      this.logger.error(`Error retrieving audit logs: ${(error as Error).message}`);
      return { logs: [], total: 0 };
    }
  }

  /**
   * Get audit summary for a resource
   */
  async getResourceAuditTrail(
    resourceType: string,
    resourceId: string,
    limit: number = 50,
  ): Promise<AuditLogEntry[]> {
    try {
      const logs = await this.auditLogModel
        .find({ resourceType, resourceId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      return logs.map((l) => this.toAuditLogEntry(l));
    } catch (error) {
      this.logger.error(
        `Error retrieving resource audit trail: ${(error as Error).message}`,
      );
      return [];
    }
  }

  /**
   * Generate audit report
   */
  async generateReport(
    startDate: Date,
    endDate: Date,
    filters?: {
      action?: AuditAction;
      severity?: AuditSeverity;
      teamId?: string;
    },
  ): Promise<any> {
    try {
      const query: Record<string, any> = {
        createdAt: { $gte: startDate, $lte: endDate },
      };

      if (filters?.action) {
        query.action = filters.action;
      }

      if (filters?.severity) {
        query.severity = filters.severity;
      }

      if (filters?.teamId) {
        query.teamId = filters.teamId;
      }

      const logs = await this.auditLogModel.find(query).lean();

      // Aggregate statistics
      const stats = {
        totalEvents: logs.length,
        byAction: {} as Record<string, number>,
        bySeverity: {} as Record<string, number>,
        byStatus: {} as Record<string, number>,
        byResourceType: {} as Record<string, number>,
        failureRate: 0,
      };

      logs.forEach((log: any) => {
        stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;
        stats.bySeverity[log.severity] = (stats.bySeverity[log.severity] || 0) + 1;
        stats.byStatus[log.status] = (stats.byStatus[log.status] || 0) + 1;
        stats.byResourceType[log.resourceType] =
          (stats.byResourceType[log.resourceType] || 0) + 1;
      });

      const failedCount = stats.byStatus['FAILURE'] || 0;
      stats.failureRate = logs.length > 0 ? (failedCount / logs.length) * 100 : 0;

      return { stats, logs: logs.slice(0, 100) }; // Return first 100 logs
    } catch (error) {
      this.logger.error(`Error generating audit report: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Determine severity based on action
   */
  private determineSeverity(action: AuditAction): AuditSeverity {
    const criticalActions = [
      AuditAction.TOKEN_CREATE,
      AuditAction.TOKEN_REVOKE,
      AuditAction.LOGIN_FAILED,
      AuditAction.PERMISSION_DENIED,
    ];

    const highActions = [
      AuditAction.IMPORT_FAILED,
      AuditAction.SYSTEM_ERROR,
      AuditAction.ROLE_CHANGE,
    ];

    if (criticalActions.includes(action)) {
      return AuditSeverity.CRITICAL;
    }

    if (highActions.includes(action)) {
      return AuditSeverity.HIGH;
    }

    return AuditSeverity.MEDIUM;
  }

  /**
   * Convert MongoDB document to AuditLogEntry
   */
  private toAuditLogEntry(doc: any): AuditLogEntry {
    return {
      _id: doc._id?.toString(),
      action: doc.action,
      resourceType: doc.resourceType,
      resourceId: doc.resourceId,
      userId: doc.userId,
      teamId: doc.teamId,
      ipAddress: doc.ipAddress,
      userAgent: doc.userAgent,
      status: doc.status,
      severity: doc.severity,
      changes: doc.changes,
      message: doc.message,
      maskedFields: doc.maskedFields,
      errorDetails: doc.errorDetails,
      createdAt: doc.createdAt,
    };
  }
}
