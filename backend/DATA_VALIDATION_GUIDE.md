# Data Validation Guide

This guide explains the validation layer implemented for the User Story Map Tool, including cycle detection, hierarchy constraints, and data integrity checks.

## Overview

The validation layer enforces business logic constraints at multiple levels:

1. **Schema Level** - Mongoose pre-save hooks for basic validation
2. **Service Level** - `DataValidationService` for complex business rules
3. **Guard Level** - `NodeValidationGuard` and `EdgeValidationGuard` for request validation
4. **Hierarchy Level** - `HierarchyRepairService` for consistency maintenance

## Validation Rules

### Node Validation

#### Creation Validation
```typescript
// Validating node creation
const validation = await validationService.validateNodeCreation(teamId, {
  summary: 'Feature Name',
  parentId: 'parent-node-id', // optional
  description: 'Description',
  ticketId: 'JIRA-123',
});

if (!validation.isValid) {
  console.log(validation.errors);
}
```

**Rules:**
- ✅ `teamId` is required and non-empty
- ✅ `summary` is required and max 500 characters
- ✅ `description` is max 2000 characters (optional)
- ✅ If `parentId` provided, parent node must exist in same team
- ✅ Parent node must not be descendant of this node (cycle prevention)

#### Update Validation
```typescript
// Validating node update
const validation = await validationService.validateNodeUpdate(
  nodeId,
  teamId,
  {
    parentId: 'new-parent-id', // changing parent
    summary: 'New Summary',
  }
);
```

**Rules:**
- ✅ Node must exist
- ✅ Summary cannot be empty if updated
- ✅ Changing parent must not create cycle
- ✅ New parent must exist in same team
- ✅ Ancestor path automatically updated

#### Deletion Validation
```typescript
// Validating node deletion
const validation = await validationService.validateNodeDeletion(
  nodeId,
  teamId
);

// Returns warnings if node has children
if (validation.warnings.length > 0) {
  console.log(validation.warnings);
  // Children will be reassigned to parent or become root nodes
}
```

**Rules:**
- ✅ Node must exist
- ✅ Warns if node has children
- ✅ Children are reassigned to parent node
- ✅ Ancestor paths are automatically updated

### Edge Validation

#### Creation Validation
```typescript
// Validating edge creation
const validation = await validationService.validateEdgeCreation(teamId, {
  sourceNodeId: 'node-1',
  targetNodeId: 'node-2',
  type: 'parent-child', // or 'cross'
  kind: 'depends-on', // for cross-edges
  targetTeamId: 'target-team', // for cross-edges
});

if (!validation.isValid) {
  console.log(validation.errors);
}
```

**Rules:**
- ✅ Source and target node IDs must be valid ObjectIds
- ✅ Cannot create self-loop (source ≠ target)
- ✅ Source node must exist in team
- ✅ Target node must exist (in same team or specified targetTeamId)
- ✅ Cross-edges must specify:
  - `kind` - relationship type
  - `targetTeamId` - target team ID
- ✅ Parent-child edges must not have `targetTeamId`

#### Deletion Validation
```typescript
// Validating edge deletion
const validation = await validationService.validateEdgeDeletion(
  edgeId,
  teamId
);
```

**Rules:**
- ✅ Edge must exist in team

## Cycle Detection

Cycles are prevented through ancestor path validation:

```typescript
// Ancestor path example:
// Root → A → B → C
// Node C's ancestorPath = [Root._id, A._id, B._id]
// If trying to set C as B's parent: would create cycle
// B._id is in C's ancestor path → PREVENTED

const hasCycle = await validationService.detectCycle(
  nodeId,
  newParentId,
  teamId
);

if (hasCycle) {
  throw new Error('Cannot create cycle');
}
```

**How It Works:**
1. Get new parent's ancestor path
2. Check if current node is in that path
3. If yes → cycle would be created → reject
4. If no → cycle-safe → allow

## Single Parent Constraint

Each node has exactly one parent:

```typescript
// Node schema enforces:
parentId: Types.ObjectId | null // only one parent

// When updating parent:
1. Check old parentId
2. Validate new parentId
3. Update ancestor path
4. Recursively update descendants
```

## Hierarchy Repair

The `HierarchyRepairService` maintains consistency:

```typescript
// Update ancestor path when parent changes
await hierarchyService.updateAncestorPath(
  nodeId,
  newParentId,
  teamId
);

// Repair entire team hierarchy
const result = await hierarchyService.repairTeamHierarchy(teamId);
console.log(`Repaired ${result.repaired} nodes`);

// Validate and report issues
const report = await hierarchyService.validateAndReport(teamId);
console.log(`Found ${report.issuesFound.length} issues`);

// Handle node deletion
const result = await hierarchyService.handleNodeDeletion(nodeId, teamId);
console.log(`Reassigned ${result.reassigned} children`);
```

**Repairs:**
- ✅ Recalculates ancestor paths
- ✅ Updates depths
- ✅ Detects cycles
- ✅ Finds missing ancestors
- ✅ Fixes parent mismatches

## Validation Guards

Guards automatically validate requests:

### NodeValidationGuard
```typescript
@UseGuards(NodeValidationGuard)
@Post('/nodes')
createNode(@Body() data: any) {
  // Guard validates before reaching controller
  // Returns 400 Bad Request if validation fails
}
```

**Validates:**
- Node creation
- Node updates
- Node deletion

### EdgeValidationGuard
```typescript
@UseGuards(EdgeValidationGuard)
@Post('/edges')
createEdge(@Body() data: any) {
  // Guard validates edge creation
  // Checks cross-edge constraints
}
```

**Validates:**
- Edge creation
- Edge deletion
- Cross-edge requirements

## TeamId Validation

All operations require valid `teamId`:

```typescript
// TeamId must be provided
const validation = await validationService.validateNodeCreation(
  teamId, // required
  nodeData
);

// TeamId is used to isolate data:
// - Each node belongs to specific team
// - Cross-edges can reference different teams
// - Validation ensures cross-team references are valid
```

## API Usage Examples

### Creating a Node with Validation
```typescript
// POST /api/v1/map/nodes
{
  "teamId": "team-123",
  "summary": "User Authentication",
  "parentId": "node-parent-id",
  "description": "Implement user login functionality",
  "ticketId": "JIRA-456"
}

// Response (if valid):
{
  "_id": "node-new-id",
  "teamId": "team-123",
  "summary": "User Authentication",
  "parentId": "node-parent-id",
  "ancestorPath": ["root-id", "node-parent-id"],
  "depth": 2,
  "createdAt": "2025-10-28T..."
}

// Response (if invalid):
{
  "statusCode": 400,
  "message": "Node validation failed",
  "errors": [
    "Parent node ... does not exist in team"
  ]
}
```

### Creating an Edge with Validation
```typescript
// POST /api/v1/map/edges
{
  "teamId": "team-123",
  "sourceNodeId": "node-1",
  "targetNodeId": "node-2",
  "type": "cross",
  "kind": "depends-on",
  "targetTeamId": "team-456"
}

// Validates:
// ✓ Both nodes exist
// ✓ No self-loop
// ✓ Cross-edge has targetTeamId
// ✓ Target node exists in target team
```

### Checking Hierarchy Health
```typescript
// GET /api/v1/map/validate
const report = await validationService.validateHierarchy(teamId);

if (!report.isValid) {
  console.log('Issues found:');
  report.errors.forEach(error => console.log(error));

  // Can trigger repair
  const repair = await hierarchyService.repairTeamHierarchy(teamId);
  console.log(`Repaired ${repair.repaired} nodes`);
}
```

## Error Handling

Validation errors are returned with details:

```typescript
{
  "statusCode": 400,
  "message": "Node validation failed",
  "errors": [
    "Node summary is required and cannot be empty",
    "Parent node 507f1f77bcf86cd799439011 does not exist in team",
    "Cannot set parent: would create a cycle"
  ]
}
```

## Performance Considerations

### Database Queries
- ✅ Indexed lookups for fast validation
- ✅ Compound indexes on (teamId, parentId)
- ✅ Ancestor path indexes for cycle detection

### Caching Opportunities
- 🔄 Cache ancestor paths during batch operations
- 🔄 Batch validate multiple nodes together
- 🔄 Defer hierarchy repair to off-peak times

## Troubleshooting

### Cycle Detected
**Problem:** "Cannot set parent: would create a cycle"

**Solution:**
```typescript
// Check ancestor path
const ancestors = await validationService.getNodeAncestors(nodeId, teamId);
// Ensure new parent is not in this list
```

### Parent Node Not Found
**Problem:** "Parent node ... does not exist in team"

**Solution:**
```typescript
// Verify parent exists in same team
const parent = await nodeModel.findOne({
  _id: parentId,
  teamId: teamId // same team
});
```

### Hierarchy Inconsistency
**Problem:** Depth or ancestor path mismatch

**Solution:**
```typescript
// Repair hierarchy
const result = await hierarchyService.repairTeamHierarchy(teamId);
console.log(`Repaired ${result.repaired} nodes`);

// Validate after repair
const validation = await validationService.validateHierarchy(teamId);
```

## Testing Validation

```typescript
describe('Node Validation', () => {
  it('should prevent cycles', async () => {
    // Create: Root → A → B
    const root = await createNode('Root');
    const a = await createNode('A', root._id);
    const b = await createNode('B', a._id);

    // Try to set B as Root's parent (would create cycle)
    const validation = await validationService.validateNodeUpdate(
      root._id,
      teamId,
      { parentId: b._id }
    );

    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('would create a cycle');
  });

  it('should enforce single parent', async () => {
    const node = await nodeModel.findById(nodeId);
    expect(node.parentId).toBeNull(); // or single ObjectId
  });
});
```

## Best Practices

1. **Always use guards** - Attach `@UseGuards()` to controllers
2. **Handle warnings** - Check warnings on deletion
3. **Repair regularly** - Run hierarchy repair on imports
4. **Index maintenance** - Ensure all recommended indexes exist
5. **Error feedback** - Return detailed validation errors to users
6. **Batch operations** - Group related operations
7. **Monitor performance** - Watch cycle detection queries

## References

- Node Schema: `src/story-map/schemas/node.schema.ts`
- Edge Schema: `src/story-map/schemas/edge.schema.ts`
- Validation Service: `src/story-map/services/data-validation.service.ts`
- Hierarchy Service: `src/story-map/services/hierarchy-repair.service.ts`
- Validation Guards: `src/story-map/guards/`
