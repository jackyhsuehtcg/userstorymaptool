/**
 * Migration interface for database schema migrations
 */
export interface Migration {
  /**
   * Unique version identifier (timestamp format recommended: YYYYMMDDHHMMSS)
   */
  version: string;

  /**
   * Migration description
   */
  description: string;

  /**
   * Execute the migration (upgrade)
   */
  up: () => Promise<void>;

  /**
   * Rollback the migration (downgrade)
   */
  down?: () => Promise<void>;

  /**
   * Whether this migration can be rolled back
   */
  reversible?: boolean;
}
