/**
 * ID Generation Utilities
 * Provides secure and unique ID generation for nodes and other entities
 */

/**
 * Generate a unique node ID using crypto.randomUUID()
 * Returns a short, memorable ID suitable for display and storage
 *
 * @returns Unique node ID in format: node-{uuid}
 * @example "node-550e8400-e29b-41d4-a716-446655440000"
 */
export function generateNodeId(): string {
  return `node-${crypto.randomUUID()}`;
}

/**
 * Generate a short display ID from a full node ID
 * Extracts the last 8 characters for user-friendly display
 *
 * @param nodeId - Full node ID (e.g., "node-550e8400-e29b-41d4-a716-446655440000")
 * @returns Short ID suitable for display (e.g., "440000")
 * @example
 * getShortId("node-550e8400-e29b-41d4-a716-446655440000") // "55440000"
 */
export function getShortId(nodeId: string): string {
  // Extract UUID part and return last 8 chars
  const uuidPart = nodeId.replace(/^node-/, '');
  return uuidPart.substring(uuidPart.length - 8);
}

/**
 * Get a concise display ID - just the last 6 hex digits
 * Even more compact for better UI presentation
 *
 * @param nodeId - Full node ID
 * @returns Ultra-short ID (e.g., "440000")
 * @example
 * getCompactId("node-550e8400-e29b-41d4-a716-446655440000") // "440000"
 */
export function getCompactId(nodeId: string): string {
  const uuidPart = nodeId.replace(/^node-/, '');
  return uuidPart.substring(uuidPart.length - 6);
}

/**
 * Validate if a string is a valid node ID format
 *
 * @param id - ID to validate
 * @returns true if valid node ID format
 */
export function isValidNodeId(id: string): boolean {
  return /^node-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id);
}
