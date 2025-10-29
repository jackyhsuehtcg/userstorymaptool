import React, { useCallback, useRef, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  ControlButton,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  type Connection,
  type Node,
  type Edge,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useMapStore } from '../stores/mapStore';
import { NodeCard } from './NodeCard';
import { calculateLayout, getNodeOpacity, getNodeHighlightColor } from '../utils/layout';
import './Canvas.scss';

const nodeTypes = {
  storyNode: NodeCard,
};

/**
 * Inner Canvas Component
 * Contains the ReactFlow visualization (must be inside ReactFlowProvider)
 */
const CanvasInner: React.FC = () => {
  const nodes = useMapStore((state) => state.nodes);
  const edges = useMapStore((state) => state.edges);
  const selectedNodeId = useMapStore((state) => state.selectedNodeId);
  const setSelectedNodeId = useMapStore((state) => state.setSelectedNodeId);
  const addEdgeToStore = useMapStore((state) => state.addEdge);
  const updateNode = useMapStore((state) => state.updateNode);

  const { fitView } = useReactFlow();
  const layoutCalculatedRef = useRef(false);

  // Calculate layout whenever nodes or edges change
  const layoutedNodes = useMemo(() => {
    if (!layoutCalculatedRef.current || nodes.length > 0) {
      const positioned = calculateLayout(nodes, edges, {
        direction: 'TB',
        nodeSeparation: 220,
        rankSeparation: 150,
        teamSpaceHeight: 250,
      });
      layoutCalculatedRef.current = true;
      return positioned;
    }
    return nodes;
  }, [nodes, edges]);

  // Convert store nodes/edges to React Flow format with highlights
  const rfNodes: Node[] = useMemo(
    () =>
      layoutedNodes.map((node) => {
        const opacity = getNodeOpacity(node.id, selectedNodeId, layoutedNodes, edges);
        const highlightColor = getNodeHighlightColor(
          node.id,
          selectedNodeId,
          layoutedNodes,
          edges
        );

        return {
          id: node.id,
          data: { label: node.summary, node },
          position: { x: node.x ?? 0, y: node.y ?? 0 },
          type: 'storyNode',
          selected: node.id === selectedNodeId,
          style: {
            ...node.style,
            opacity,
            borderColor: highlightColor,
            transition: 'opacity 0.2s, border-color 0.2s',
          },
        };
      }),
    [layoutedNodes, selectedNodeId, edges]
  );

  const rfEdges: Edge[] = useMemo(
    () =>
      edges.map((edge) => {
        // Highlight cross-edges connected to selected node
        const isConnectedToSelected =
          selectedNodeId && (edge.source === selectedNodeId || edge.target === selectedNodeId);

        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: edge.type === 'cross' ? 'smoothstep' : 'default',
          animated: isConnectedToSelected && edge.type === 'cross' ? true : false,
          style: {
            stroke: edge.type === 'cross' ? '#ff6b6b' : '#999',
            strokeWidth: isConnectedToSelected ? 3 : 2,
            opacity: selectedNodeId ? (isConnectedToSelected ? 1 : 0.3) : 1,
            transition: 'stroke-width 0.2s, opacity 0.2s',
          },
        } as Edge;
      }),
    [edges, selectedNodeId]
  );

  const [nodesState, setNodesState, onNodesChange] = useNodesState(rfNodes);
  const [edgesState, setEdgesState, onEdgesChange] = useEdgesState(rfEdges);

  // Update React Flow state when store changes
  React.useEffect(() => {
    setNodesState(rfNodes);
  }, [rfNodes, setNodesState]);

  React.useEffect(() => {
    setEdgesState(rfEdges);
  }, [rfEdges, setEdgesState]);

  // Sync node positions back to store when they move
  const handleNodesChange = useCallback(
    (changes: any[]) => {
      onNodesChange(changes);

      // Update node positions in store
      changes.forEach((change) => {
        if (change.type === 'position' && change.position) {
          updateNode(change.id, {
            x: Math.round(change.position.x),
            y: Math.round(change.position.y),
          });
        }
      });
    },
    [onNodesChange, updateNode]
  );

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

  const handleFitToScreen = useCallback(() => {
    setTimeout(() => {
      fitView({ padding: 0.2, minZoom: 0.5, maxZoom: 2 });
    }, 0);
  }, [fitView]);

  return (
    <div className="canvas-container">
      <ReactFlow
        nodes={nodesState}
        edges={edgesState}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        fitView
      >
        <Background
          color="#aaa"
          gap={16}
          style={{ backgroundColor: '#fafafa' }}
        />
        <Controls>
          <ControlButton
            onClick={handleFitToScreen}
            title="Fit View"
          >
            ⊡
          </ControlButton>
        </Controls>
        <MiniMap />
      </ReactFlow>
    </div>
  );
};

/**
 * Canvas Component
 * Wraps the inner canvas with ReactFlowProvider
 */
export const Canvas: React.FC = () => {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
};
