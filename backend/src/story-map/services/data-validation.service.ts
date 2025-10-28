import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Node, NodeDocument } from '../schemas/node.schema';
import { Edge, EdgeDocument } from '../schemas/edge.schema';

/**
 * Data validation service for story map entities
 * Handles business logic constraints and validations
 */
@Injectable()
export class DataValidationService {
  private readonly logger = new Logger(DataValidationService.name);

  constructor(
    @InjectModel('Node') private nodeModel: Model<NodeDocument>,
    @InjectModel('Edge') private edgeModel: Model<EdgeDocument>,
  ) {}

  /**
   * Validate node creation
   * - Check teamId exists and is valid
   * - Validate parent node exists if parentId provided
   * - Check single parent constraint
   * - Update ancestor path
   */
  async validateNodeCreation(
    teamId: string,
    data: any,
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Validate teamId format
    if (!teamId || typeof teamId !== 'string' || teamId.trim().length === 0) {
      errors.push('Invalid teamId format');
      return { isValid: false, errors };
    }

    // Validate required fields
    if (!data.summary || data.summary.trim().length === 0) {
      errors.push('Node summary is required and cannot be empty');
    }

    if (data.summary && data.summary.length > 500) {
      errors.push('Node summary must not exceed 500 characters');
    }

    if (data.description && data.description.length > 2000) {
      errors.push('Node description must not exceed 2000 characters');
    }

    // Validate parent node if provided
    if (data.parentId) {
      try {
        const parentExists = await this.validateParentNodeExists(
          teamId,
          data.parentId,
        );
        if (!parentExists) {
          errors.push(`Parent node ${data.parentId} does not exist in team`);
        }
      } catch (error) {
        errors.push(`Error validating parent node: ${(error as Error).message}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate node update
   * - Check parent change doesn't create cycle
   * - Validate new parent exists if parentId changed
   * - Update ancestor path if parent changes
   */
  async validateNodeUpdate(
    nodeId: string,
    teamId: string,
    data: any,
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Validate node exists
    const node = await this.nodeModel.findOne({
      _id: new Types.ObjectId(nodeId),
      teamId,
    });

    if (!node) {
      errors.push(`Node ${nodeId} not found in team`);
      return { isValid: false, errors };
    }

    // Validate summary if provided
    if (data.summary !== undefined) {
      if (!data.summary || data.summary.trim().length === 0) {
        errors.push('Node summary cannot be empty');
      }
      if (data.summary.length > 500) {
        errors.push('Node summary must not exceed 500 characters');
      }
    }

    // Validate parent change if provided
    if (data.parentId !== undefined && data.parentId !== node.parentId) {
      try {
        // Check for cycle
        const hasCycle = await this.detectCycle(
          nodeId,
          data.parentId,
          teamId,
        );
        if (hasCycle) {
          errors.push('Cannot set parent: would create a cycle');
        }

        // Check parent exists
        if (data.parentId !== null) {
          const parentExists = await this.validateParentNodeExists(
            teamId,
            data.parentId,
          );
          if (!parentExists) {
            errors.push(`Parent node ${data.parentId} does not exist in team`);
          }
        }
      } catch (error) {
        errors.push(`Error validating parent change: ${(error as Error).message}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate node deletion
   * - Check if node has children (provide warning)
   * - Update children's parent if needed
   */
  async validateNodeDeletion(
    nodeId: string,
    teamId: string,
  ): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check node exists
    const node = await this.nodeModel.findOne({
      _id: new Types.ObjectId(nodeId),
      teamId,
    });

    if (!node) {
      errors.push(`Node ${nodeId} not found`);
      return { isValid: false, errors, warnings };
    }

    // Check for children
    const childCount = await this.nodeModel.countDocuments({
      parentId: new Types.ObjectId(nodeId),
      teamId,
    });

    if (childCount > 0) {
      warnings.push(
        `Node has ${childCount} child node(s). They will be reassigned to parent node or become root nodes.`,
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate edge creation
   * - Check nodes exist
   * - Prevent self-loops
   * - Validate cross-edge constraints
   */
  async validateEdgeCreation(
    teamId: string,
    data: any,
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Validate node IDs format
    if (!data.sourceNodeId || !this.isValidObjectId(data.sourceNodeId)) {
      errors.push('Invalid source node ID');
    }

    if (!data.targetNodeId || !this.isValidObjectId(data.targetNodeId)) {
      errors.push('Invalid target node ID');
    }

    // Check for self-loop
    if (
      data.sourceNodeId &&
      data.targetNodeId &&
      data.sourceNodeId.toString() === data.targetNodeId.toString()
    ) {
      errors.push('Cannot create edge: source and target cannot be the same');
      return { isValid: false, errors };
    }

    try {
      // Validate source node exists
      const sourceExists = await this.nodeModel.exists({
        _id: new Types.ObjectId(data.sourceNodeId),
        teamId,
      });

      if (!sourceExists) {
        errors.push(`Source node ${data.sourceNodeId} not found in team`);
      }

      // Validate target node and team
      if (data.type === 'cross') {
        // Cross-edge validation
        if (!data.targetTeamId) {
          errors.push('Cross-edge must specify targetTeamId');
        }

        const targetExists = await this.nodeModel.exists({
          _id: new Types.ObjectId(data.targetNodeId),
          teamId: data.targetTeamId,
        });

        if (!targetExists) {
          errors.push(
            `Target node ${data.targetNodeId} not found in target team`,
          );
        }
      } else {
        // Parent-child edge: target must be in same team
        const targetExists = await this.nodeModel.exists({
          _id: new Types.ObjectId(data.targetNodeId),
          teamId,
        });

        if (!targetExists) {
          errors.push(`Target node ${data.targetNodeId} not found in team`);
        }
      }
    } catch (error) {
      errors.push(`Error validating edge: ${(error as Error).message}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate edge deletion
   */
  async validateEdgeDeletion(
    edgeId: string,
    teamId: string,
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    const edge = await this.edgeModel.findOne({
      _id: new Types.ObjectId(edgeId),
      teamId,
    });

    if (!edge) {
      errors.push(`Edge ${edgeId} not found`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Detect cycle in ancestor path
   * Returns true if setting parentId would create a cycle
   */
  private async detectCycle(
    nodeId: string,
    newParentId: string | null,
    teamId: string,
  ): Promise<boolean> {
    if (!newParentId) {
      return false; // No cycle if parent is null
    }

    try {
      const newParentObjId = new Types.ObjectId(newParentId);
      const nodeObjId = new Types.ObjectId(nodeId);

      // Get new parent's ancestor path
      const newParent = await this.nodeModel.findOne({
        _id: newParentObjId,
        teamId,
      });

      if (!newParent) {
        return false;
      }

      // Check if node is in new parent's ancestor path
      // This would mean setting new parent as child would create cycle
      const ancestors = newParent.ancestorPath || [];
      return ancestors.some((ancestor) => ancestor.equals(nodeObjId));
    } catch (error) {
      this.logger.error(`Error detecting cycle: ${error}`);
      return false;
    }
  }

  /**
   * Validate parent node exists
   */
  private async validateParentNodeExists(
    teamId: string,
    parentId: string,
  ): Promise<boolean> {
    try {
      const exists = await this.nodeModel.exists({
        _id: new Types.ObjectId(parentId),
        teamId,
      });
      return !!exists;
    } catch (error) {
      this.logger.error(`Error validating parent node: ${error}`);
      return false;
    }
  }

  /**
   * Build ancestor path for new node
   */
  async buildAncestorPath(
    parentId: string | null,
    teamId: string,
  ): Promise<Types.ObjectId[]> {
    if (!parentId) {
      return [];
    }

    try {
      const parent = await this.nodeModel.findOne({
        _id: new Types.ObjectId(parentId),
        teamId,
      });

      if (!parent) {
        throw new Error('Parent node not found');
      }

      // Ancestor path = parent's ancestor path + parent's ID
      return [...(parent.ancestorPath || []), new Types.ObjectId(parentId)];
    } catch (error) {
      this.logger.error(`Error building ancestor path: ${error}`);
      return [];
    }
  }

  /**
   * Check if ObjectId is valid format
   */
  private isValidObjectId(id: any): boolean {
    try {
      return Types.ObjectId.isValid(id);
    } catch {
      return false;
    }
  }

  /**
   * Get all descendants of a node
   */
  async getNodeDescendants(
    nodeId: string,
    teamId: string,
  ): Promise<NodeDocument[]> {
    try {
      const nodeObjId = new Types.ObjectId(nodeId);
      return await this.nodeModel.find({
        ancestorPath: nodeObjId,
        teamId,
      });
    } catch (error) {
      this.logger.error(`Error getting descendants: ${error}`);
      return [];
    }
  }

  /**
   * Get all ancestors of a node
   */
  async getNodeAncestors(
    nodeId: string,
    teamId: string,
  ): Promise<NodeDocument[]> {
    try {
      const node = await this.nodeModel.findOne({
        _id: new Types.ObjectId(nodeId),
        teamId,
      });

      if (!node || !node.ancestorPath || node.ancestorPath.length === 0) {
        return [];
      }

      return await this.nodeModel.find({
        _id: { $in: node.ancestorPath },
        teamId,
      });
    } catch (error) {
      this.logger.error(`Error getting ancestors: ${error}`);
      return [];
    }
  }

  /**
   * Validate entire hierarchy
   * Check all nodes for consistency
   */
  async validateHierarchy(teamId: string): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    try {
      // Get all nodes
      const nodes = await this.nodeModel.find({ teamId });

      for (const node of nodes) {
        // Check ancestor path validity
        const ancestors = node.ancestorPath || [];

        // Verify all ancestors exist
        for (const ancestorId of ancestors) {
          const exists = await this.nodeModel.exists({
            _id: ancestorId,
            teamId,
          });

          if (!exists) {
            errors.push(
              `Node ${node._id}: ancestor ${ancestorId} does not exist`,
            );
          }
        }

        // Verify node is not in its own ancestor path
        if (ancestors.some((a) => a.equals(node._id))) {
          errors.push(`Node ${node._id}: is in its own ancestor path (cycle)`);
        }

        // Verify depth matches ancestor path length
        const expectedDepth = ancestors.length;
        if (node.depth !== expectedDepth) {
          errors.push(
            `Node ${node._id}: depth mismatch. Expected ${expectedDepth}, got ${node.depth}`,
          );
        }

        // Verify parent is first unprocessed ancestor
        if (node.parentId && ancestors.length > 0) {
          const lastAncestor = ancestors[ancestors.length - 1];
          if (!lastAncestor.equals(node.parentId)) {
            errors.push(
              `Node ${node._id}: parent ID doesn't match last ancestor`,
            );
          }
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Error validating hierarchy: ${(error as Error).message}`],
      };
    }
  }
}
