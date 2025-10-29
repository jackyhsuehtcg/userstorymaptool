import React from 'react';
import { Handle, Position } from '@xyflow/react';
import type { StoryMapNode } from '../types';
import './NodeCard.scss';

interface NodeCardProps {
  data: {
    label: string;
    node: StoryMapNode;
  };
  selected?: boolean;
}

/**
 * Node Card Component
 * Displays story map node information in a structured card format
 * Shows ID, team, summary, description, ticket labels, and custom styling
 */
export const NodeCard: React.FC<NodeCardProps> = ({ data, selected }) => {
  const node = data.node;
  const hasDescription = node.description && node.description.trim().length > 0;
  const hasTickets = node.ticketLabels && node.ticketLabels.length > 0;

  return (
    <div
      className={`story-node-card ${selected ? 'selected' : ''}`}
      title={`${node.summary}${hasDescription ? '\n\n' + node.description : ''}`}
    >
      {/* Node Summary (Title) */}
      <div className="node-summary">{node.summary}</div>

      {/* Description Preview */}
      {hasDescription && node.description && (
        <div className="node-description">
          {node.description.substring(0, 60)}
          {node.description.length > 60 ? '...' : ''}
        </div>
      )}

      {/* Team Badge */}
      {node.teamId && (
        <div className="node-team">
          <span className="team-label">👥</span>
          <span className="team-value">{node.teamId}</span>
        </div>
      )}

      {/* Ticket Labels */}
      {hasTickets && node.ticketLabels && (
        <div className="node-tickets">
          {node.ticketLabels.slice(0, 3).map((label) => (
            <span key={label} className="ticket-badge">
              {label}
            </span>
          ))}
          {node.ticketLabels.length > 3 && (
            <span className="ticket-more">+{node.ticketLabels.length - 3}</span>
          )}
        </div>
      )}

      {/* Connection Handles */}
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};
