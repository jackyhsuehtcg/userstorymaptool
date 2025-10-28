import { Migration } from './migration.interface';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

/**
 * Migration 002: Create database indexes for performance
 * This migration ensures all recommended indexes are created
 */
export class Migration002 implements Migration {
  version = '20251028002';
  description = 'Create performance indexes';
  reversible = true;

  constructor(private connection: Connection) {}

  async up(): Promise<void> {
    const db = this.connection.db;
    if (!db) {
      throw new Error('Database connection not available');
    }

    // Get all collections
    const nodesCollection = db.collection('nodes');
    const edgesCollection = db.collection('edges');
    const auditLogsCollection = db.collection('auditLogs');
    const apiTokensCollection = db.collection('apiTokens');

    // Node indexes
    await Promise.all([
      nodesCollection.createIndex({ teamId: 1, parentId: 1 }),
      nodesCollection.createIndex({ ancestorPath: 1 }),
      nodesCollection.createIndex({ teamId: 1, depth: 1 }),
      nodesCollection.createIndex({ status: 1, teamId: 1 }),
      nodesCollection.createIndex({ createdAt: -1 }),
      nodesCollection.createIndex(
        { ticketId: 1, teamId: 1 },
        { sparse: true },
      ),
      nodesCollection.createIndex({
        summary: 'text',
        description: 'text',
      }),
    ]);
    console.log('Created indexes for nodes collection');

    // Edge indexes
    await Promise.all([
      edgesCollection.createIndex({ sourceNodeId: 1, type: 1 }),
      edgesCollection.createIndex({ targetNodeId: 1, type: 1 }),
      edgesCollection.createIndex({ teamId: 1, type: 1 }),
      edgesCollection.createIndex({ targetTeamId: 1, type: 1 }, { sparse: true }),
      edgesCollection.createIndex({ teamId: 1, active: 1 }),
      edgesCollection.createIndex({ kind: 1, type: 1 }, { sparse: true }),
      edgesCollection.createIndex({ createdAt: -1 }),
    ]);
    console.log('Created indexes for edges collection');

    // AuditLog indexes
    await Promise.all([
      auditLogsCollection.createIndex({ teamId: 1, action: 1 }),
      auditLogsCollection.createIndex({ teamId: 1, userId: 1 }),
      auditLogsCollection.createIndex({ resourceType: 1, resourceId: 1 }),
      auditLogsCollection.createIndex({ createdAt: -1, teamId: 1 }),
      auditLogsCollection.createIndex({ severity: 1, createdAt: -1 }),
      auditLogsCollection.createIndex({ status: 1, teamId: 1 }),
      auditLogsCollection.createIndex({ requestId: 1 }, { sparse: true }),
      auditLogsCollection.createIndex({ sessionId: 1 }, { sparse: true }),
      auditLogsCollection.createIndex(
        { createdAt: 1 },
        { expireAfterSeconds: 90 * 24 * 60 * 60 }, // TTL: 90 days
      ),
    ]);
    console.log('Created indexes for auditLogs collection');

    // ApiToken indexes
    await Promise.all([
      apiTokensCollection.createIndex({ active: 1, teamId: 1 }),
      apiTokensCollection.createIndex({ expiresAt: 1 }, { sparse: true }),
      apiTokensCollection.createIndex({ tokenHash: 1, active: 1 }),
      apiTokensCollection.createIndex({ revokedAt: 1 }, { sparse: true }),
      apiTokensCollection.createIndex({ createdAt: -1 }),
      apiTokensCollection.createIndex({ teamId: 1, createdBy: 1 }),
    ]);
    console.log('Created indexes for apiTokens collection');
  }

  async down(): Promise<void> {
    const db = this.connection.db;
    if (!db) {
      throw new Error('Database connection not available');
    }

    // Drop all indexes (except default _id index)
    const nodesCollection = db.collection('nodes');
    const edgesCollection = db.collection('edges');
    const auditLogsCollection = db.collection('auditLogs');
    const apiTokensCollection = db.collection('apiTokens');

    await Promise.all([
      (nodesCollection as any).dropIndexes?.() || Promise.resolve(),
      (edgesCollection as any).dropIndexes?.() || Promise.resolve(),
      (auditLogsCollection as any).dropIndexes?.() || Promise.resolve(),
      (apiTokensCollection as any).dropIndexes?.() || Promise.resolve(),
    ]);
    console.log('Dropped all indexes');
  }
}
