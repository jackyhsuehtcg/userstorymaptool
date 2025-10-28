import React, { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useMapStore } from '../stores/mapStore';
import { NodeCard } from './NodeCard';

const nodeTypes = {
  storyNode: NodeCard,
};

export const Canvas: React.FC = () => {
  const nodes = useMapStore((state) => state.nodes);
  const edges = useMapStore((state) => state.edges);
  const selectedNodeId = useMapStore((state) => state.selectedNodeId);
  const setSelectedNodeId = useMapStore((state) => state.setSelectedNodeId);
  const addEdgeToStore = useMapStore((state) => state.addEdge);

  // Convert store nodes/edges to React Flow format
  const rfNodes: Node[] = nodes.map((node) => ({
    id: node.id,
    data: { label: node.summary, node },
    position: { x: node.x ?? 0, y: node.y ?? 0 },
    type: 'storyNode',
    selected: node.id === selectedNodeId,
    style: node.style,
  }));

  const rfEdges: Edge[] = edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: edge.type === 'cross' ? 'smoothstep' : 'default',
    style: edge.type === 'cross' ? { stroke: '#ff6b6b', strokeWidth: 2 } : {},
  }));

  const [nodesState, setNodesState, onNodesChange] = useNodesState(rfNodes);
  const [edgesState, setEdgesState, onEdgesChange] = useEdgesState(rfEdges);

  // Update React Flow state when store changes
  React.useEffect(() => {
    setNodesState(rfNodes);
  }, [rfNodes, setNodesState]);

  React.useEffect(() => {
    setEdgesState(rfEdges);
  }, [rfEdges, setEdgesState]);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        addEdgeToStore({
          id: `${connection.source}-${connection.target}`,
          source: connection.source,
          target: connection.target,
          type: 'tree',
        });
      }
    },
    [addEdgeToStore]
  );

  const handleNodeClick: NodeMouseHandler = (_event, node) => {
    setSelectedNodeId(node.id);
  };

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodesState}
        edges={edgesState}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
};
