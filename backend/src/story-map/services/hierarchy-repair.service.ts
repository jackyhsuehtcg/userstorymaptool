import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Node, NodeDocument } from '../schemas/node.schema';

/**
 * Service to repair and maintain hierarchy consistency
 */
@Injectable()
export class HierarchyRepairService {
  private readonly logger = new Logger(HierarchyRepairService.name);

  constructor(@InjectModel('Node') private nodeModel: Model<NodeDocument>) {}

  /**
   * Update ancestor path for a node
   * Called when parent is changed
   */
  async updateAncestorPath(
    nodeId: string,
    parentId: string | null,
    teamId: string,
  ): Promise<void> {
    try {
      const nodeObjId = new Types.ObjectId(nodeId);

      let ancestorPath: Types.ObjectId[] = [];
      let depth = 0;

      // Build ancestor path from parent
      if (parentId) {
        const parentObjId = new Types.ObjectId(parentId);
        const parent = await this.nodeModel.findOne({
          _id: parentObjId,
          teamId,
        });

        if (parent) {
          ancestorPath = [...(parent.ancestorPath || []), parentObjId];
          depth = ancestorPath.length;
        }
      }

      // Update node
      await this.nodeModel.updateOne(
        { _id: nodeObjId, teamId },
        {
          parentId: parentId ? new Types.ObjectId(parentId) : null,
          ancestorPath,
          depth,
        },
      );

      // Recursively update all descendants
      await this.updateDescendantPaths(nodeObjId, teamId);

      this.logger.log(
        `Updated ancestor path for node ${nodeId} and descendants`,
      );
    } catch (error) {
      this.logger.error(`Error updating ancestor path: ${error}`);
      throw error;
    }
  }

  /**
   * Recursively update ancestor paths for all descendants
   */
  private async updateDescendantPaths(
    parentId: Types.ObjectId,
    teamId: string,
  ): Promise<void> {
    try {
      // Get all children
      const children = await this.nodeModel.find({
        parentId,
        teamId,
      });

      // Update each child's ancestor path
      for (const child of children) {
        const parentNode = await this.nodeModel.findOne({
          _id: parentId,
          teamId,
        });

        if (parentNode) {
          const newAncestorPath = [
            ...(parentNode.ancestorPath || []),
            parentId,
          ];
          const newDepth = newAncestorPath.length;

          await this.nodeModel.updateOne(
            { _id: child._id, teamId },
            {
              ancestorPath: newAncestorPath,
              depth: newDepth,
            },
          );

          // Recursively update this child's descendants
          await this.updateDescendantPaths(child._id, teamId);
        }
      }
    } catch (error) {
      this.logger.error(`Error updating descendant paths: ${error}`);
      throw error;
    }
  }

  /**
   * Repair entire hierarchy for a team
   * Recalculates all ancestor paths and depths
   */
  async repairTeamHierarchy(teamId: string): Promise<{
    repaired: number;
    errors: string[];
  }> {
    try {
      const errors: string[] = [];
      let repairedCount = 0;

      // Get all root nodes (no parent)
      const rootNodes = await this.nodeModel.find({
        parentId: null,
        teamId,
      });

      // Process each root and its descendants
      for (const root of rootNodes) {
        const count = await this.repairNodeBranch(root._id, [], 0, teamId);
        repairedCount += count;
      }

      this.logger.log(
        `Repaired hierarchy for team ${teamId}: ${repairedCount} nodes`,
      );

      return { repaired: repairedCount, errors };
    } catch (error) {
      return {
        repaired: 0,
        errors: [`Error repairing hierarchy: ${(error as Error).message}`],
      };
    }
  }

  /**
   * Recursively repair a branch of the hierarchy
   */
  private async repairNodeBranch(
    nodeId: Types.ObjectId,
    ancestorPath: Types.ObjectId[],
    depth: number,
    teamId: string,
  ): Promise<number> {
    let repairedCount = 0;

    try {
      // Update current node
      await this.nodeModel.updateOne(
        { _id: nodeId, teamId },
        { ancestorPath, depth },
      );
      repairedCount++;

      // Process all children
      const children = await this.nodeModel.find({
        parentId: nodeId,
        teamId,
      });

      const newAncestorPath = [...ancestorPath, nodeId];
      const newDepth = depth + 1;

      for (const child of children) {
        const childCount = await this.repairNodeBranch(
          child._id,
          newAncestorPath,
          newDepth,
          teamId,
        );
        repairedCount += childCount;
      }
    } catch (error) {
      this.logger.error(
        `Error repairing node branch ${nodeId}: ${error}`,
      );
    }

    return repairedCount;
  }

  /**
   * Handle node deletion - reassign children to parent or make them root
   */
  async handleNodeDeletion(
    nodeId: string,
    teamId: string,
  ): Promise<{ orphaned: number; reassigned: number }> {
    try {
      const nodeObjId = new Types.ObjectId(nodeId);

      // Get the node to be deleted
      const node = await this.nodeModel.findOne({
        _id: nodeObjId,
        teamId,
      });

      if (!node) {
        return { orphaned: 0, reassigned: 0 };
      }

      const parentId = node.parentId;

      // Get all children
      const children = await this.nodeModel.find({
        parentId: nodeObjId,
        teamId,
      });

      const reassignedCount = children.length;

      // Reassign or orphan children
      for (const child of children) {
        await this.updateAncestorPath(
          child._id.toString(),
          parentId ? parentId.toString() : null,
          teamId,
        );
      }

      this.logger.log(
        `Handled deletion of node ${nodeId}: ${reassignedCount} children reassigned`,
      );

      return { orphaned: 0, reassigned: reassignedCount };
    } catch (error) {
      this.logger.error(`Error handling node deletion: ${error}`);
      throw error;
    }
  }

  /**
   * Validate and report hierarchy issues
   */
  async validateAndReport(teamId: string): Promise<{
    totalNodes: number;
    issuesFound: Array<{
      type: string;
      nodeId: string;
      message: string;
    }>;
  }> {
    const issues: Array<{
      type: string;
      nodeId: string;
      message: string;
    }> = [];

    try {
      const nodes = await this.nodeModel.find({ teamId });

      for (const node of nodes) {
        // Check for cycles
        if (node.ancestorPath && node.ancestorPath.includes(node._id)) {
          issues.push({
            type: 'CYCLE',
            nodeId: node._id.toString(),
            message: 'Node is in its own ancestor path',
          });
        }

        // Check depth consistency
        const expectedDepth = node.ancestorPath?.length || 0;
        if (node.depth !== expectedDepth) {
          issues.push({
            type: 'DEPTH_MISMATCH',
            nodeId: node._id.toString(),
            message: `Expected depth ${expectedDepth}, but found ${node.depth}`,
          });
        }

        // Check ancestor validity
        if (node.ancestorPath) {
          for (const ancestorId of node.ancestorPath) {
            const exists = await this.nodeModel.exists({
              _id: ancestorId,
              teamId,
            });

            if (!exists) {
              issues.push({
                type: 'MISSING_ANCESTOR',
                nodeId: node._id.toString(),
                message: `Ancestor ${ancestorId} does not exist`,
              });
            }
          }
        }

        // Check parent consistency
        if (node.parentId && node.ancestorPath && node.ancestorPath.length > 0) {
          const lastAncestor =
            node.ancestorPath[node.ancestorPath.length - 1];
          if (!lastAncestor.equals(node.parentId)) {
            issues.push({
              type: 'PARENT_MISMATCH',
              nodeId: node._id.toString(),
              message: 'Parent ID does not match last ancestor',
            });
          }
        }
      }

      return { totalNodes: nodes.length, issuesFound: issues };
    } catch (error) {
      throw new Error(`Error validating hierarchy: ${(error as Error).message}`);
    }
  }
}
