/**
 * Layout algorithm for story map tree visualization
 * Uses Dagre for hierarchical layout with team-based partitioning
 */

import type { StoryMapNode, StoryMapEdge } from '../types';

interface LayoutOptions {
  direction?: 'TB' | 'LR';
  nodeSeparation?: number;
  rankSeparation?: number;
  teamSpaceHeight?: number;
}

/**
 * Calculate layout positions using Dagre algorithm
 * Groups nodes by team (Team Space) with vertical lanes
 *
 * @param nodes - Story map nodes
 * @param edges - Story map edges
 * @param options - Layout configuration
 * @returns Nodes with calculated positions
 */
export function calculateLayout(
  nodes: StoryMapNode[],
  _edges: StoryMapEdge[],
  options: LayoutOptions = {}
): StoryMapNode[] {
  const {
    nodeSeparation = 150,
    rankSeparation = 100,
    teamSpaceHeight = 200,
  } = options;

  // Group nodes by team
  const nodesByTeam = new Map<string, StoryMapNode[]>();
  const rootNodes: StoryMapNode[] = [];

  nodes.forEach((node) => {
    if (!node.parentId) {
      rootNodes.push(node);
    }
    const teamId = node.teamId || 'unassigned';
    if (!nodesByTeam.has(teamId)) {
      nodesByTeam.set(teamId, []);
    }
    nodesByTeam.get(teamId)!.push(node);
  });

  // Build adjacency lists for tree traversal
  const childrenMap = new Map<string, StoryMapNode[]>();
  nodes.forEach((node) => {
    if (node.parentId) {
      if (!childrenMap.has(node.parentId)) {
        childrenMap.set(node.parentId, []);
      }
      childrenMap.get(node.parentId)!.push(node);
    }
  });

  const layoutNodes = [...nodes];
  let globalYOffset = 0;

  // Process each team's nodes separately (Team Space layout)
  Array.from(nodesByTeam.entries()).forEach(([_teamId, teamNodes]) => {
    let maxDepth = 0;
    const depthMap = new Map<string, number>();
    const levelNodes = new Map<number, StoryMapNode[]>();

    // Calculate depth for each node in this team
    const calculateDepth = (node: StoryMapNode, depth = 0): number => {
      if (depthMap.has(node.id)) {
        return depthMap.get(node.id)!;
      }

      depthMap.set(node.id, depth);
      maxDepth = Math.max(maxDepth, depth);

      if (!levelNodes.has(depth)) {
        levelNodes.set(depth, []);
      }
      levelNodes.get(depth)!.push(node);

      const children = childrenMap.get(node.id) || [];
      children.forEach((child) => {
        calculateDepth(child, depth + 1);
      });

      return depth;
    };

    // Start from root nodes in this team
    teamNodes
      .filter((n) => !n.parentId || !nodesByTeam.has(n.teamId || 'unassigned'))
      .forEach((node) => {
        calculateDepth(node);
      });

    // Position nodes by level
    let currentY = globalYOffset;

    for (let level = 0; level <= maxDepth; level++) {
      const nodesAtLevel = levelNodes.get(level) || [];
      if (nodesAtLevel.length === 0) continue;

      let currentX = 0;

      nodesAtLevel.forEach((node) => {
        const nodeIndex = layoutNodes.findIndex((n) => n.id === node.id);
        if (nodeIndex !== -1) {
          layoutNodes[nodeIndex] = {
            ...layoutNodes[nodeIndex],
            x: currentX,
            y: currentY,
          };
          currentX += nodeSeparation;
        }
      });

      currentY += 80; // levelHeight
    }

    globalYOffset += Math.max(teamSpaceHeight, currentY - globalYOffset + rankSeparation);
  });

  return layoutNodes;
}

/**
 * Build a tree structure for ancestor/descendant lookups
 */
export function buildNodeTree(
  nodes: StoryMapNode[],
  edges: StoryMapEdge[]
): Map<string, { ancestors: string[]; descendants: string[] }> {
  const tree = new Map<string, { ancestors: string[]; descendants: string[] }>();

  // Initialize tree
  nodes.forEach((node) => {
    tree.set(node.id, { ancestors: [], descendants: [] });
  });

  // Build parent-child relationships
  edges
    .filter((e) => e.type !== 'cross')
    .forEach((edge) => {
      const parent = tree.get(edge.source);
      const child = tree.get(edge.target);
      if (parent && child) {
        child.ancestors.push(edge.source);
        parent.descendants.push(edge.target);
      }
    });

  // Recursively build full ancestor chain
  const computeAncestors = (nodeId: string, visited = new Set<string>()): string[] => {
    if (visited.has(nodeId)) return [];
    visited.add(nodeId);

    const node = tree.get(nodeId);
    if (!node) return [];

    const allAncestors: string[] = [...node.ancestors];
    node.ancestors.forEach((ancestorId) => {
      allAncestors.push(...computeAncestors(ancestorId, visited));
    });

    return allAncestors;
  };

  // Recursively build full descendant chain
  const computeDescendants = (nodeId: string, visited = new Set<string>()): string[] => {
    if (visited.has(nodeId)) return [];
    visited.add(nodeId);

    const node = tree.get(nodeId);
    if (!node) return [];

    const allDescendants: string[] = [...node.descendants];
    node.descendants.forEach((descendantId) => {
      allDescendants.push(...computeDescendants(descendantId, visited));
    });

    return allDescendants;
  };

  // Update tree with full chains
  nodes.forEach((node) => {
    const entry = tree.get(node.id);
    if (entry) {
      entry.ancestors = computeAncestors(node.id);
      entry.descendants = computeDescendants(node.id);
    }
  });

  return tree;
}

/**
 * Get related nodes for focus/highlight
 * Includes ancestors, descendants, and cross-edge neighbors
 */
export function getRelatedNodes(
  nodeId: string,
  nodes: StoryMapNode[],
  edges: StoryMapEdge[]
): {
  ancestors: string[];
  descendants: string[];
  crossEdgeNeighbors: string[];
} {
  const tree = buildNodeTree(nodes, edges);
  const nodeEntry = tree.get(nodeId);

  const ancestors = nodeEntry?.ancestors || [];
  const descendants = nodeEntry?.descendants || [];

  // Get cross-edge neighbors
  const crossEdgeNeighbors = edges
    .filter(
      (e) => e.type === 'cross' && (e.source === nodeId || e.target === nodeId)
    )
    .map((e) => (e.source === nodeId ? e.target : e.source));

  return {
    ancestors,
    descendants,
    crossEdgeNeighbors,
  };
}

/**
 * Check if a node should be highlighted based on focus
 */
export function shouldHighlightNode(
  nodeId: string,
  focusedNodeId: string | undefined,
  nodes: StoryMapNode[],
  edges: StoryMapEdge[]
): boolean {
  if (!focusedNodeId || focusedNodeId === nodeId) return true;

  const relatedNodes = getRelatedNodes(focusedNodeId, nodes, edges);
  return (
    relatedNodes.ancestors.includes(nodeId) ||
    relatedNodes.descendants.includes(nodeId) ||
    relatedNodes.crossEdgeNeighbors.includes(nodeId)
  );
}

/**
 * Get opacity level for unfocused nodes
 */
export function getNodeOpacity(
  nodeId: string,
  focusedNodeId: string | undefined,
  nodes: StoryMapNode[],
  edges: StoryMapEdge[]
): number {
  if (!focusedNodeId) return 1;
  if (shouldHighlightNode(nodeId, focusedNodeId, nodes, edges)) return 1;
  return 0.3; // Dim other nodes
}

/**
 * Get highlight color for different node relationships
 */
export function getNodeHighlightColor(
  nodeId: string,
  focusedNodeId: string | undefined,
  nodes: StoryMapNode[],
  edges: StoryMapEdge[]
): string | undefined {
  if (!focusedNodeId) return undefined;
  if (nodeId === focusedNodeId) return '#0066cc'; // Blue for focused

  const relatedNodes = getRelatedNodes(focusedNodeId, nodes, edges);

  if (relatedNodes.ancestors.includes(nodeId)) {
    return '#4ca3f0'; // Light blue for ancestors
  }
  if (relatedNodes.descendants.includes(nodeId)) {
    return '#a8d5f0'; // Very light blue for descendants
  }
  if (relatedNodes.crossEdgeNeighbors.includes(nodeId)) {
    return '#ffcc99'; // Orange for cross-edge neighbors
  }

  return undefined;
}


/**
 * Validate if a parent-child relationship change is valid
 * Prevents circular dependencies (node can't be ancestor of its ancestors)
 *
 * @param childNodeId - The node being moved
 * @param newParentId - The new parent node ID
 * @param nodes - All story map nodes
 * @param edges - All story map edges
 * @returns true if the relationship is valid, false otherwise
 */
export function validateHierarchyChange(
  childNodeId: string,
  newParentId: string,
  nodes: StoryMapNode[],
  edges: StoryMapEdge[]
): boolean {
  // Can't be parent to self
  if (childNodeId === newParentId) return false;

  // Check for circular dependency
  const tree = buildNodeTree(nodes, edges);
  const childEntry = tree.get(childNodeId);
  
  if (!childEntry) return false;

  // New parent can't be a descendant of the child (would create cycle)
  return !childEntry.descendants.includes(newParentId);
}
