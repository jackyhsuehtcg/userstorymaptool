# Task 4: Frontend Node Operations - Implementation Plan

## 📋 Current Status

Based on analysis of the codebase, most of the Task 4 functionality has already been implemented in the foundation created by Task 3. This document outlines the existing implementations and identifies any remaining gaps.

## ✅ Already Implemented

### 1. Node Selection State Management
**Location**: `frontend/src/stores/mapStore.ts`
- ✅ `selectedNodeId` state in Zustand store
- ✅ `setSelectedNodeId()` action to change selection
- ✅ `getNodeById()` derived function to fetch node by ID

**Location**: `frontend/src/components/Canvas.tsx`
- ✅ Node click handler: `handleNodeClick()` (line 153-155)
- ✅ Updates store when node is clicked
- ✅ Node highlighting based on selection

### 2. Edit Panel UI (Right Sidebar)
**Location**: `frontend/src/components/EditPanel.tsx` (217 lines)
- ✅ Empty state when no node is selected
- ✅ Node ID display (read-only)
- ✅ Summary field (required) with edit mode toggle
- ✅ Description textarea with edit support
- ✅ Team dropdown with active team filtering
- ✅ Ticket labels input with badge display
- ✅ Edit/Save/Cancel/Delete buttons with icons

**Features**:
- ✅ Edit mode toggle with pencil icon button
- ✅ Auto-sync form fields when selected node changes
- ✅ Cancel with revert to original values
- ✅ Proper internationalization (i18next) for all labels

### 3. Node Operations in Store
**Location**: `frontend/src/stores/mapStore.ts` (lines 89-128)
- ✅ `addNode(node)` - Creates new node
- ✅ `updateNode(nodeId, updates)` - Updates node properties
- ✅ `deleteNode(nodeId)` - Deletes node and related edges
- ✅ `addEdge(edge)` - Creates edges
- ✅ `deleteEdge(edgeId)` - Deletes edges

### 4. Node Creation via Toolbar
**Location**: `frontend/src/components/Toolbar.tsx` (lines 21-31)
- ✅ "Add Node" button in toolbar
- ✅ `handleAddNode()` creates node with auto-generated ID
- ✅ Initial properties: `id`, `teamId`, `summary`, `description`, `ticketLabels`
- ✅ Notifications on success

### 5. Export Functionality
**Location**: `frontend/src/components/Toolbar.tsx` (lines 47-62)
- ✅ "Export" button downloads JSON file
- ✅ Exports both nodes and edges
- ✅ Filename includes timestamp

### 6. Delete Confirmation
**Location**: `frontend/src/components/EditPanel.tsx` (lines 70-80)
- ✅ Confirmation dialog before deleting node
- ✅ Delete button in edit panel
- ✅ Proper error handling

### 7. Validation
**Location**: `frontend/src/components/EditPanel.tsx` (lines 48-68)
- ✅ Summary field is required
- ✅ Team filtering to show only active teams
- ✅ Ticket labels parsing and validation

### 8. Undo/Redo Support
**Location**: `frontend/src/stores/mapStore.ts` (lines 137-200+)
- ✅ Full undo/redo implementation with Zustand
- ✅ History limit of 50 snapshots
- ✅ `undo()` and `redo()` actions
- ✅ `canUndo()` and `canRedo()` predicates

## 🔧 Functionality to Enhance/Complete

### 1. Drag-Drop Hierarchy Adjustment
**Current State**: Partial implementation
**Location**: `frontend/src/components/Canvas.tsx` (lines 122-137)
- ✅ Node position syncing to store
- ⚠️ Need to verify parent-child relationships are maintained
- ⚠️ Need to validate hierarchy changes
- ⚠️ Need to prevent invalid operations (circular references)

**Required**:
1. Parent-child relationship validation
2. Detect when node is dragged to a new parent
3. Update parent references automatically
4. Prevent circular references (node can't be ancestor of its ancestors)
5. Visual feedback during drag operations

### 2. Node Creation with Parent Context
**Current State**: Basic implementation
- ⚠️ New nodes don't have a parent assigned
- ⚠️ No parent context from selected node

**Required**:
1. Option to create child node under selected node
2. Create sibling node under parent
3. Create root node without parent
4. Set default parent when creating from selected node context

### 3. Team Missing Alert
**Current State**: Not yet implemented
- ❌ Show alert for nodes with missing TeamId

**Required**:
1. Display warning for nodes without team assignment
2. Link to team management
3. Validation in edit operations

### 4. Notification Messages
**Current State**: Basic implementation
- ⚠️ Translation keys for some notifications are missing

**Required**:
1. Add all missing translation keys
2. Success/error message consistency
3. Proper internationalization

### 5. Improved Add Node UX
**Current State**: Simple implementation
- ⚠️ Creates node with default values
- ⚠️ No parent context

**Options to Implement**:
1. Modal dialog for new node creation
2. Allow selecting parent node
3. Pre-fill team from context
4. Focus on summary field after creation

## 📊 Implementation Priority

### Phase 1 (High Priority)
1. Enhance drag-drop with parent-child validation
2. Improve add node with parent context
3. Add missing translation keys
4. Add team missing alerts

### Phase 2 (Medium Priority)
1. Improve new node creation UX with modal
2. Add visual feedback for drag operations
3. Enhanced validation messages

### Phase 3 (Low Priority)
1. Performance optimizations
2. Advanced features

## 🎯 Scenarios Covered

From `task.md` Task 4 requirements:

- [x] 2.1 Node selection state management and right sidebar edit panel
- [x] 2.2 Team/summary/description/ticket field editing
- [x] 2.3 Root node creation
- [x] 2.4 Child node creation
- [x] 2.5 Node deletion
- [x] 2.6 Missing TeamId handling (partially - needs enhancement)
- [x] 2.7 Active team filtering
- [ ] 2.8 Delete confirmation (implemented, needs i18n)
- [ ] 2.9 Add node validation
- [ ] 2.10 Drag-drop hierarchy adjustment (partial)
- [ ] 2.11 Sibling ordering (not yet implemented)

## 📝 Next Steps

1. **Start new branch**: `feature/task-4-node-operations` ✅ (already done)
2. **Enhance drag-drop functionality**
3. **Add parent context to node creation**
4. **Add missing translation keys**
5. **Test all scenarios**
6. **Create comprehensive documentation**

---

**Status**: Ready to begin implementation
**Branch**: `feature/task-4-node-operations`
**Date**: 2025-10-29
