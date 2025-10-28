import { create } from 'zustand';
import type { StoryMapState, StoryMapNode, StoryMapEdge, Team } from '../types';

// Undo/Redo history management
interface UndoRedoState {
  history: StoryMapState[];
  future: StoryMapState[];
}

// Define the extended state with temporal methods
interface ExtendedState extends StoryMapState {
  // Mutations
  setNodes: (nodes: StoryMapNode[]) => void;
  setEdges: (edges: StoryMapEdge[]) => void;
  setTeams: (teams: Team[]) => void;
  setSelectedNodeId: (nodeId?: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error?: string) => void;
  setLastSyncTime: (time: string) => void;

  // Node operations
  addNode: (node: StoryMapNode) => void;
  updateNode: (nodeId: string, updates: Partial<StoryMapNode>) => void;
  deleteNode: (nodeId: string) => void;

  // Edge operations
  addEdge: (edge: StoryMapEdge) => void;
  deleteEdge: (edgeId: string) => void;

  // Reset
  reset: () => void;

  // Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Derived values
  getNodeById: (nodeId: string) => StoryMapNode | undefined;
  getTeamById: (teamId: string) => Team | undefined;
  getChildNodes: (parentId: string) => StoryMapNode[];

  // Internal undo/redo state
  _undoRedo: UndoRedoState;
  _pushHistory: (state: StoryMapState) => void;
}

const initialState: StoryMapState = {
  nodes: [],
  edges: [],
  teams: [],
  isLoading: false,
};

const initialUndoRedo: UndoRedoState = {
  history: [],
  future: [],
};

// Create store with undo/redo support (max 50 snapshots)
export const useMapStore = create<ExtendedState>((set, get) => ({
  ...initialState,
  _undoRedo: initialUndoRedo,

  // Setters
  setNodes: (nodes: StoryMapNode[]) =>
    set((state: ExtendedState) => {
      get()._pushHistory(state);
      return { nodes };
    }),

  setEdges: (edges: StoryMapEdge[]) =>
    set((state: ExtendedState) => {
      get()._pushHistory(state);
      return { edges };
    }),

  setTeams: (teams: Team[]) => set({ teams }),

  setSelectedNodeId: (selectedNodeId?: string) => set({ selectedNodeId }),

  setLoading: (isLoading: boolean) => set({ isLoading }),

  setError: (error?: string) => set({ error }),

  setLastSyncTime: (lastSyncTime: string) => set({ lastSyncTime }),

  // Node operations
  addNode: (node: StoryMapNode) =>
    set((state: ExtendedState) => {
      get()._pushHistory(state);
      return { nodes: [...state.nodes, node] };
    }),

  updateNode: (nodeId: string, updates: Partial<StoryMapNode>) =>
    set((state: ExtendedState) => {
      get()._pushHistory(state);
      return {
        nodes: state.nodes.map((n: StoryMapNode) =>
          n.id === nodeId ? { ...n, ...updates } : n
        ),
      };
    }),

  deleteNode: (nodeId: string) =>
    set((state: ExtendedState) => {
      get()._pushHistory(state);
      return {
        nodes: state.nodes.filter((n: StoryMapNode) => n.id !== nodeId),
        edges: state.edges.filter(
          (e: StoryMapEdge) => e.source !== nodeId && e.target !== nodeId
        ),
      };
    }),

  // Edge operations
  addEdge: (edge: StoryMapEdge) =>
    set((state: ExtendedState) => {
      get()._pushHistory(state);
      return { edges: [...state.edges, edge] };
    }),

  deleteEdge: (edgeId: string) =>
    set((state: ExtendedState) => {
      get()._pushHistory(state);
      return { edges: state.edges.filter((e: StoryMapEdge) => e.id !== edgeId) };
    }),

  // Reset to initial state
  reset: () =>
    set({
      ...initialState,
      _undoRedo: initialUndoRedo,
    }),

  // Undo/Redo implementation
  undo: () => {
    const state = get();
    if (state._undoRedo.history.length === 0) return;

    const newHistory = [...state._undoRedo.history];
    const previousState = newHistory.pop();

    if (previousState) {
      set({
        nodes: previousState.nodes,
        edges: previousState.edges,
        teams: previousState.teams,
        selectedNodeId: previousState.selectedNodeId,
        isLoading: previousState.isLoading,
        error: previousState.error,
        lastSyncTime: previousState.lastSyncTime,
        _undoRedo: {
          history: newHistory,
          future: [
            {
              nodes: state.nodes,
              edges: state.edges,
              teams: state.teams,
              selectedNodeId: state.selectedNodeId,
              isLoading: state.isLoading,
              error: state.error,
              lastSyncTime: state.lastSyncTime,
            },
            ...state._undoRedo.future,
          ],
        },
      });
    }
  },

  redo: () => {
    const state = get();
    if (state._undoRedo.future.length === 0) return;

    const newFuture = [...state._undoRedo.future];
    const nextState = newFuture.shift();

    if (nextState) {
      set({
        nodes: nextState.nodes,
        edges: nextState.edges,
        teams: nextState.teams,
        selectedNodeId: nextState.selectedNodeId,
        isLoading: nextState.isLoading,
        error: nextState.error,
        lastSyncTime: nextState.lastSyncTime,
        _undoRedo: {
          history: [
            ...state._undoRedo.history,
            {
              nodes: state.nodes,
              edges: state.edges,
              teams: state.teams,
              selectedNodeId: state.selectedNodeId,
              isLoading: state.isLoading,
              error: state.error,
              lastSyncTime: state.lastSyncTime,
            },
          ],
          future: newFuture,
        },
      });
    }
  },

  canUndo: () => get()._undoRedo.history.length > 0,

  canRedo: () => get()._undoRedo.future.length > 0,

  // Getters
  getNodeById: (nodeId: string) => {
    const state = get();
    return state.nodes.find((n: StoryMapNode) => n.id === nodeId);
  },

  getTeamById: (teamId: string) => {
    const state = get();
    return state.teams.find((t: Team) => t.id === teamId);
  },

  getChildNodes: (parentId: string) => {
    const state = get();
    return state.nodes.filter((n: StoryMapNode) => n.parentId === parentId);
  },

  // Internal history management (max 50 snapshots)
  _pushHistory: (state: StoryMapState) => {
    set((s: ExtendedState) => {
      const newHistory = [
        ...s._undoRedo.history,
        {
          nodes: state.nodes,
          edges: state.edges,
          teams: state.teams,
          selectedNodeId: state.selectedNodeId,
          isLoading: state.isLoading,
          error: state.error,
          lastSyncTime: state.lastSyncTime,
        },
      ];

      // Keep only last 50 snapshots
      if (newHistory.length > 50) {
        newHistory.shift();
      }

      return {
        _undoRedo: {
          history: newHistory,
          future: [],
        },
      };
    });
  },
}));
