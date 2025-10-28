import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

interface SessionData {
  _id?: string;
  userId: string;
  teamId?: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt: Date;
  refreshTokenExpiresAt?: Date;
  lastActivity: Date;
  ipAddress: string;
  userAgent: string;
  state?: string;
  codeVerifier?: string;
  active: boolean;
  createdAt: Date;
}

/**
 * Schema definition for session storage
 */
export const SessionSchema = {
  name: 'Session',
  schema: {
    userId: { type: String, required: true, indexed: true },
    teamId: { type: String, indexed: true },
    accessToken: { type: String, required: true },
    refreshToken: { type: String },
    tokenExpiresAt: { type: Date, required: true },
    refreshTokenExpiresAt: { type: Date },
    lastActivity: { type: Date, required: true, default: Date.now },
    ipAddress: { type: String },
    userAgent: { type: String },
    state: { type: String }, // For OAuth state tracking
    codeVerifier: { type: String }, // For PKCE
    active: { type: Boolean, default: true, indexed: true },
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
    // Start periodic cleanup of expired sessions
    this.startSessionCleanup();
  }

  /**
   * Create a new session
   */
  async createSession(
    userId: string,
    accessToken: string,
    tokenExpiresAt: Date,
    ipAddress: string,
    userAgent: string,
    options?: {
      teamId?: string;
      refreshToken?: string;
      refreshTokenExpiresAt?: Date;
      state?: string;
      codeVerifier?: string;
    },
  ): Promise<SessionData> {
    try {
      const session = new this.sessionModel({
        userId,
        teamId: options?.teamId,
        accessToken,
        refreshToken: options?.refreshToken,
        tokenExpiresAt,
        refreshTokenExpiresAt: options?.refreshTokenExpiresAt,
        ipAddress,
        userAgent,
        state: options?.state,
        codeVerifier: options?.codeVerifier,
        active: true,
        lastActivity: new Date(),
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
        await this.invalidateSession(sessionId);
        return null;
      }

      return this.toSessionData(session);
    } catch (error) {
      this.logger.error(`Error retrieving session: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Find active sessions for user
   */
  async getUserSessions(userId: string): Promise<SessionData[]> {
    try {
      const sessions = await this.sessionModel.find({
        userId,
        active: true,
        tokenExpiresAt: { $gt: new Date() },
      });

      return sessions.map((s) => this.toSessionData(s));
    } catch (error) {
      this.logger.error(`Error retrieving user sessions: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Update session activity timestamp
   */
  async updateSessionActivity(sessionId: string): Promise<void> {
    try {
      await this.sessionModel.updateOne(
        { _id: new Types.ObjectId(sessionId), active: true },
        { lastActivity: new Date() },
      );
    } catch (error) {
      this.logger.error(`Error updating session activity: ${(error as Error).message}`);
    }
  }

  /**
   * Refresh session tokens
   */
  async refreshSession(
    sessionId: string,
    newAccessToken: string,
    tokenExpiresAt: Date,
    newRefreshToken?: string,
    refreshTokenExpiresAt?: Date,
  ): Promise<SessionData | null> {
    try {
      const session = await this.sessionModel.findById(sessionId);

      if (!session) {
        return null;
      }

      session.accessToken = newAccessToken;
      session.tokenExpiresAt = tokenExpiresAt;
      session.lastActivity = new Date();

      if (newRefreshToken) {
        session.refreshToken = newRefreshToken;
      }

      if (refreshTokenExpiresAt) {
        session.refreshTokenExpiresAt = refreshTokenExpiresAt;
      }

      const updatedSession = await session.save();
      this.logger.debug(`Session refreshed: ${sessionId}`);

      return this.toSessionData(updatedSession);
    } catch (error) {
      this.logger.error(`Error refreshing session: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Invalidate session (logout)
   */
  async invalidateSession(sessionId: string): Promise<void> {
    try {
      await this.sessionModel.updateOne(
        { _id: new Types.ObjectId(sessionId) },
        { active: false, updatedAt: new Date() },
      );

      this.logger.debug(`Session invalidated: ${sessionId}`);
    } catch (error) {
      this.logger.error(`Error invalidating session: ${(error as Error).message}`);
    }
  }

  /**
   * Invalidate all sessions for user (e.g., password change)
   */
  async invalidateUserSessions(userId: string, exceptSessionId?: string): Promise<number> {
    try {
      const query: Record<string, any> = { userId, active: true };

      if (exceptSessionId) {
        query._id = { $ne: new Types.ObjectId(exceptSessionId) };
      }

      const result = await this.sessionModel.updateMany(query, {
        active: false,
        updatedAt: new Date(),
      });

      this.logger.debug(
        `Invalidated ${result.modifiedCount} sessions for user ${userId}`,
      );

      return result.modifiedCount;
    } catch (error) {
      this.logger.error(`Error invalidating user sessions: ${(error as Error).message}`);
      return 0;
    }
  }

  /**
   * Get session activity for audit purposes
   */
  async getSessionActivity(sessionId: string): Promise<{
    createdAt: Date;
    lastActivity: Date;
    duration: number;
    active: boolean;
  } | null> {
    try {
      const session = await this.sessionModel.findById(sessionId);

      if (!session) {
        return null;
      }

      const duration =
        session.lastActivity.getTime() - session.createdAt.getTime();

      return {
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        duration,
        active: session.active,
      };
    } catch (error) {
      this.logger.error(`Error getting session activity: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Cleanup expired sessions (runs periodically)
   */
  private startSessionCleanup(): void {
    const cleanupInterval = this.configService.get<number>(
      'auth.sessionCleanupInterval',
    ) || 3600000; // 1 hour default

    this.sessionCleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, cleanupInterval);

    this.logger.debug(
      `Session cleanup scheduled every ${cleanupInterval / 1000} seconds`,
    );
  }

  /**
   * Remove expired sessions from database
   */
  private async cleanupExpiredSessions(): Promise<void> {
    try {
      const result = await this.sessionModel.deleteMany({
        $or: [
          { tokenExpiresAt: { $lt: new Date() } },
          {
            refreshTokenExpiresAt: {
              $lt: new Date(),
            },
          },
        ],
      });

      if (result.deletedCount > 0) {
        this.logger.debug(
          `Cleaned up ${result.deletedCount} expired sessions`,
        );
      }
    } catch (error) {
      this.logger.error(`Error cleaning up expired sessions: ${(error as Error).message}`);
    }
  }

  /**
   * Cleanup on module destroy
   */
  onModuleDestroy(): void {
    if (this.sessionCleanupInterval) {
      clearInterval(this.sessionCleanupInterval);
    }
  }

  /**
   * Convert MongoDB document to SessionData
   */
  private toSessionData(doc: any): SessionData {
    return {
      _id: doc._id?.toString(),
      userId: doc.userId,
      teamId: doc.teamId,
      accessToken: doc.accessToken,
      refreshToken: doc.refreshToken,
      tokenExpiresAt: doc.tokenExpiresAt,
      refreshTokenExpiresAt: doc.refreshTokenExpiresAt,
      lastActivity: doc.lastActivity,
      ipAddress: doc.ipAddress,
      userAgent: doc.userAgent,
      state: doc.state,
      codeVerifier: doc.codeVerifier,
      active: doc.active,
      createdAt: doc.createdAt,
    };
  }
}
