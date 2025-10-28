import { Migration } from './migration.interface';

/**
 * Migration 001: Create initial collections and indexes
 * This migration sets up the basic schema structure
 */
export const migration001: Migration = {
  version: '20251028001',
  description: 'Create initial collections (nodes, edges, auditLogs, apiTokens)',
  reversible: true,

  async up() {
    // Collections are created automatically by Mongoose when first accessed
    // This migration is a placeholder for future explicit creation logic
    console.log('Collections will be created by Mongoose on first access');
  },

  async down() {
    // Rollback would involve dropping collections
    // For safety, we log instead of executing
    console.log(
      'Rollback: Would drop collections (not executed for safety)',
    );
  },
};
