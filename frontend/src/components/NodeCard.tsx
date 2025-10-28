import React from 'react';
import { Handle, Position } from '@xyflow/react';
import type { StoryMapNode } from '../types';

interface NodeCardProps {
  data: {
    label: string;
    node: StoryMapNode;
  };
  selected?: boolean;
}

export const NodeCard: React.FC<NodeCardProps> = ({ data, selected }) => {
  const node = data.node;

  return (
    <div
      className={`tcrt-node ${selected ? 'selected' : ''}`}
      style={{
        padding: '12px',
        borderRadius: '8px',
        border: selected ? '2px solid #007bff' : '1px solid #ddd',
        backgroundColor: '#fff',
        minWidth: '150px',
        maxWidth: '200px',
        boxShadow: selected ? '0 0 8px rgba(0,123,255,0.5)' : 'none',
      }}
    >
      <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
        ID: {node.id}
      </div>
      <div
        style={{
          fontWeight: 'bold',
          fontSize: '14px',
          marginBottom: '8px',
          wordWrap: 'break-word',
        }}
      >
        {node.summary}
      </div>
      {node.description && (
        <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>
          {node.description.substring(0, 50)}
          {node.description.length > 50 ? '...' : ''}
        </div>
      )}
      {node.teamId && (
        <div
          style={{
            fontSize: '11px',
            backgroundColor: '#f0f0f0',
            padding: '4px 8px',
            borderRadius: '4px',
            display: 'inline-block',
            marginBottom: '8px',
          }}
        >
          Team: {node.teamId}
        </div>
      )}
      {node.ticketLabels && node.ticketLabels.length > 0 && (
        <div style={{ marginTop: '8px' }}>
          {node.ticketLabels.map((label) => (
            <span
              key={label}
              style={{
                fontSize: '10px',
                backgroundColor: '#e7f3ff',
                color: '#0050b3',
                padding: '2px 6px',
                borderRadius: '3px',
                marginRight: '4px',
                display: 'inline-block',
                marginBottom: '4px',
              }}
            >
              {label}
            </span>
          ))}
        </div>
      )}

      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};
