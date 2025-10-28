/**
 * Domain Models and Types
 */

// Node representation
export interface StoryMapNode {
  id: string;
  teamId: string;
  summary: string;
  description?: string;
  ticketLabels?: string[];
  style?: Record<string, string>;
  parentId?: string;
  ancestorPath?: string[];
  x?: number;
  y?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Edge representation
export interface StoryMapEdge {
  id: string;
  source: string;
  target: string;
  type?: 'tree' | 'cross';
  kind?: string; // for cross edges
  createdAt?: string;
  updatedAt?: string;
}

// Cross edge with additional metadata
export interface CrossEdge extends StoryMapEdge {
  type: 'cross';
  kind: string;
}

// Team information
export interface Team {
  id: string;
  name: string;
  active: boolean;
}

// Audit log entry
export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

// API Token
export interface APIToken {
  id: string;
  name: string;
  createdAt: string;
  lastUsed?: string;
  value?: string; // only returned once on creation
}

// Application state
export interface StoryMapState {
  nodes: StoryMapNode[];
  edges: StoryMapEdge[];
  teams: Team[];
  selectedNodeId?: string;
  isLoading: boolean;
  error?: string;
  lastSyncTime?: string;
}

// Search filter
export interface SearchFilter {
  id?: string;
  text?: string;
  teamId?: string;
  ticketLabel?: string;
  dateRange?: { start: string; end: string };
  parentId?: string;
  crossEdgeReference?: string;
}

// Undo/Redo snapshot
export interface StateSnapshot {
  timestamp: number;
  state: StoryMapState;
}
