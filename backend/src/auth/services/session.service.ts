import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

interface SessionData {
  _id?: string;
  userId: number | string;
  accessToken: string;
  tokenExpiresAt: Date;
  lastActivity: Date;
  ipAddress: string;
  userAgent: string;
  active: boolean;
  createdAt: Date;
  metadata?: Record<string, any>;
}

/**
 * Schema definition for session storage
 */
export const SessionSchema = {
  name: 'Session',
  schema: {
    userId: { type: Number, required: true, indexed: true },
    accessToken: { type: String, required: true },
    tokenExpiresAt: { type: Date, required: true },
    lastActivity: { type: Date, required: true, default: Date.now },
    ipAddress: { type: String },
    userAgent: { type: String },
    active: { type: Boolean, default: true, indexed: true },
    metadata: { type: Object, default: {} },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
};

/**
 * Service for managing user sessions
 * Handles session creation, validation, and cleanup
 */
@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private sessionCleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    @InjectModel('Session') private sessionModel: Model<SessionData>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.startSessionCleanup();
  }

  /**
   * Create a new session
   */
  async createSession(
    userId: number | string,
    accessToken: string,
    tokenExpiresAt: Date,
    ipAddress: string,
    userAgent: string,
    metadata?: Record<string, any>,
  ): Promise<SessionData> {
    try {
      const session = new this.sessionModel({
        userId,
        accessToken,
        tokenExpiresAt,
        ipAddress,
        userAgent,
        active: true,
        lastActivity: new Date(),
        metadata: metadata || {},
      });

      const savedSession = await session.save();
      this.logger.debug(`Session created for user ${userId}`);

      return this.toSessionData(savedSession);
    } catch (error) {
      this.logger.error(`Error creating session: ${(error as Error).message}`);
      throw new Error('Failed to create session');
    }
  }

  /**
   * Retrieve session by ID
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      const session = await this.sessionModel.findById(sessionId);

      if (!session || !session.active) {
        return null;
      }

      // Check if session is expired
      if (session.tokenExpiresAt < new Date()) {
        await this.sessionModel.updateOne({ _id: sessionId }, { active: false });
        return null;
      }

      // Update last activity
      await this.sessionModel.updateOne(
        { _id: sessionId },
        { lastActivity: new Date() }
      );

      return this.toSessionData(session);
    } catch (error) {
      this.logger.error(`Error retrieving session: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Invalidate session
   */
  async invalidateSession(sessionId: string): Promise<void> {
    try {
      await this.sessionModel.updateOne({ _id: sessionId }, { active: false });
      this.logger.debug(`Session ${sessionId} invalidated`);
    } catch (error) {
      this.logger.error(`Error invalidating session: ${(error as Error).message}`);
      throw new Error('Failed to invalidate session');
    }
  }

  /**
   * Invalidate all sessions for a user
   */
  async invalidateUserSessions(userId: number | string): Promise<number> {
    try {
      const result = await this.sessionModel.updateMany(
        { userId, active: true },
        { active: false }
      );
      this.logger.debug(`Invalidated ${result.modifiedCount} sessions for user ${userId}`);
      return result.modifiedCount;
    } catch (error) {
      this.logger.error(`Error invalidating user sessions: ${(error as Error).message}`);
      throw new Error('Failed to invalidate user sessions');
    }
  }

  /**
   * Refresh session with new token
   */
  async refreshSession(
    sessionId: string,
    newAccessToken: string,
    newExpiresAt: Date,
  ): Promise<SessionData | null> {
    try {
      const session = await this.sessionModel.findByIdAndUpdate(
        sessionId,
        {
          accessToken: newAccessToken,
          tokenExpiresAt: newExpiresAt,
          lastActivity: new Date(),
          updatedAt: new Date(),
        },
        { new: true }
      );

      if (!session) {
        return null;
      }

      this.logger.debug(`Session ${sessionId} refreshed`);
      return this.toSessionData(session);
    } catch (error) {
      this.logger.error(`Error refreshing session: ${(error as Error).message}`);
      throw new Error('Failed to refresh session');
    }
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: number | string): Promise<SessionData[]> {
    try {
      const sessions = await this.sessionModel.find({
        userId,
        active: true,
        tokenExpiresAt: { $gt: new Date() },
      });

      return sessions.map((session) => this.toSessionData(session));
    } catch (error) {
      this.logger.error(`Error retrieving user sessions: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Start periodic session cleanup
   */
  private startSessionCleanup(): void {
    // Clean up expired sessions every hour
    this.sessionCleanupInterval = setInterval(async () => {
      try {
        const result = await this.sessionModel.deleteMany({
          tokenExpiresAt: { $lt: new Date() },
        });
        this.logger.debug(`Cleaned up ${result.deletedCount} expired sessions`);
      } catch (error) {
        this.logger.error(`Error cleaning up sessions: ${(error as Error).message}`);
      }
    }, 60 * 60 * 1000); // 1 hour
  }

  /**
   * Stop session cleanup
   */
  stopSessionCleanup(): void {
    if (this.sessionCleanupInterval) {
      clearInterval(this.sessionCleanupInterval);
    }
  }

  /**
   * Convert Mongoose document to SessionData
   */
  private toSessionData(session: any): SessionData {
    return {
      _id: session._id?.toString(),
      userId: session.userId,
      accessToken: session.accessToken,
      tokenExpiresAt: session.tokenExpiresAt,
      lastActivity: session.lastActivity,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      active: session.active,
      createdAt: session.createdAt,
      metadata: session.metadata || {},
    };
  }

  /**
   * Destroy cleanup resources
   */
  onModuleDestroy(): void {
    this.stopSessionCleanup();
  }
}
