# MongoDB Database Setup Guide

## Overview

This guide explains how to set up MongoDB for the User Story Map Tool, including connection configuration, health checks, replica sets, and transactions.

## Prerequisites

- MongoDB 4.0+ (for transactions support)
- MongoDB Atlas account (optional, for cloud hosting)
- Local MongoDB instance or Docker container

## Installation

### Option 1: Local MongoDB (macOS with Homebrew)

```bash
# Install MongoDB Community Edition
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB
brew services start mongodb-community

# Verify MongoDB is running
mongosh --version
```

### Option 2: Docker

```bash
# Start MongoDB container
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=root \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  -v mongodb_data:/data/db \
  mongo:latest

# Verify MongoDB is running
docker exec -it mongodb mongosh -u root -p password
```

### Option 3: MongoDB Atlas (Cloud)

1. Create account at https://www.mongodb.com/cloud/atlas
2. Create a cluster
3. Create a database user
4. Get connection string: `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<database>`

## Configuration

### Basic Configuration

Update `backend/config/default.yaml`:

```yaml
database:
  uri: mongodb://localhost:27017/story-map
  name: story-map
  options:
    useNewUrlParser: true
    useUnifiedTopology: true
    retryWrites: true
    w: majority
  connectionPool:
    minPoolSize: 2
    maxPoolSize: 10
  replicaSet: null
  healthCheck:
    enabled: true
    interval: 30000  # 30 seconds
```

### Environment Variables

Override configuration via environment:

```bash
export CONFIG_DATABASE_URI=mongodb://localhost:27017/story-map
export CONFIG_DATABASE_NAME=story-map
```

For MongoDB Atlas:

```bash
export CONFIG_DATABASE_URI=mongodb+srv://user:password@cluster.mongodb.net/story-map
```

## Connection Pool

The application uses MongoDB connection pooling with the following defaults:

- **Min Pool Size**: 2 connections
- **Max Pool Size**: 10 connections
- **Socket Timeout**: 45 seconds
- **Server Selection Timeout**: 5 seconds

Configure in `config/default.yaml`:

```yaml
database:
  connectionPool:
    minPoolSize: 2      # Minimum connections to maintain
    maxPoolSize: 10     # Maximum concurrent connections
```

## Replica Set (for Transactions)

Transactions in MongoDB require a replica set. To enable:

1. **For Local MongoDB with Docker Compose**:

Create `docker-compose.yml`:

```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:latest
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_ROOT_USERNAME=root
      - MONGO_INITDB_ROOT_PASSWORD=password
    volumes:
      - mongodb_data:/data/db
    command: mongod --replSet rs0

  mongo-init:
    image: mongo:latest
    depends_on:
      - mongodb
    entrypoint:
      - bash
      - -c
      - |
        mongosh -u root -p password --authenticationDatabase admin mongodb://mongodb:27017 --eval "rs.initiate({_id:'rs0',members:[{_id:0,host:'mongodb:27017'}]})"

volumes:
  mongodb_data:
```

Start with:

```bash
docker-compose up -d
```

2. **Configure in Application**:

Update `backend/config/default.yaml`:

```yaml
database:
  replicaSet: rs0  # Name of replica set
```

Or via environment:

```bash
export CONFIG_DATABASE_REPLICASET=rs0
```

## Health Checks

The application includes automatic health checks every 30 seconds.

### Check Health Status

```bash
# Get health status
curl http://localhost:8788/api/v1/health/database

# Response:
{
  "status": "up",
  "database": "story-map",
  "replicaSet": "rs0",
  "connected": true,
  "message": "Database is healthy",
  "timestamp": "2025-10-28T16:00:00.000Z"
}
```

### Get Connection Details

```bash
curl http://localhost:8788/api/v1/health/database/info

# Response includes:
{
  "connection": {
    "state": "connected",
    "readyState": 1,
    "database": "story-map",
    "host": "localhost",
    "port": 27017,
    "models": [],
    "collections": []
  },
  "stats": {...},
  "serverInfo": {...},
  "replicaSet": {...}
}
```

### Quick Health Check

```bash
curl http://localhost:8788/api/v1/health/database/check

# Response:
{
  "healthy": true,
  "connected": true,
  "database": "story-map",
  "replicaSet": "rs0",
  "timestamp": "2025-10-28T16:00:00.000Z"
}
```

## Transactions

Transactions are fully enabled in the application. They require:

1. MongoDB 4.0+
2. Replica set configured
3. Session enabled

### Using Transactions in Code

```typescript
import { DatabaseService } from './database/database.service';

@Injectable()
export class MyService {
  constructor(private databaseService: DatabaseService) {}

  async performTransaction() {
    // Create a session
    const session = await this.databaseService.createSession();

    try {
      // Start transaction
      session.startTransaction();

      // Perform database operations
      // ... your code ...

      // Commit transaction
      await session.commitTransaction();
    } catch (error) {
      // Rollback on error
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }
}
```

## Connection States

The application tracks connection states:

| State | Value | Description |
|-------|-------|-------------|
| Disconnected | 0 | Not connected |
| Connected | 1 | Connected and ready |
| Connecting | 2 | Connection in progress |
| Disconnecting | 3 | Disconnection in progress |

## Troubleshooting

### Connection Refused

```
Error: connect ECONNREFUSED 127.0.0.1:27017
```

**Solutions**:
- Ensure MongoDB is running: `brew services list`
- Check URI configuration
- Verify MongoDB is listening on the correct port

### Authentication Failed

```
Error: Authentication failed
```

**Solutions**:
- Verify username and password in URI
- Check MongoDB user exists: `db.getUser("username")`
- Create user if needed

### Replica Set Not Available

```
Warning: Replica set not available
```

**Solutions**:
- Transactions won't work without replica set
- Configure replica set for production
- For development, can work without transactions

### Connection Timeout

```
Error: connect ETIMEDOUT
```

**Solutions**:
- Increase server selection timeout in config
- Check network connectivity
- Verify MongoDB is accessible from your machine
- For MongoDB Atlas, check IP whitelist

## Monitoring

### Check MongoDB Status

```bash
# Via mongosh shell
mongosh mongodb://localhost:27017

> db.adminCommand("ping")
{ ok: 1 }

> db.stats()
# Shows database statistics

> rs.status()
# Shows replica set status
```

### Application Logs

```bash
# Watch application logs
tail -f .backend.log | grep -i database

# Or filter health check logs
tail -f .backend.log | grep -E "health|database"
```

## Performance Tuning

### Connection Pool Settings

For high-load applications:

```yaml
database:
  connectionPool:
    minPoolSize: 5      # Start with more connections
    maxPoolSize: 20     # Allow more concurrent connections
```

### Indexing

Create indexes for frequently queried fields:

```typescript
// Define in schema
nodeSchema.index({ teamId: 1, parentId: 1 });
nodeSchema.index({ createdAt: -1 });
```

### Data Aggregation

Use MongoDB aggregation pipeline for complex queries:

```typescript
const result = await Model.aggregate([
  { $match: { status: 'active' } },
  { $group: { _id: '$category', count: { $sum: 1 } } },
  { $sort: { count: -1 } },
]);
```

## Backup and Restore

### Backup Database

```bash
# Local backup
mongodump --uri="mongodb://user:password@localhost:27017/story-map" \
  --out=/path/to/backup

# MongoDB Atlas automated backups are available in console
```

### Restore Database

```bash
mongorestore --uri="mongodb://user:password@localhost:27017/story-map" \
  /path/to/backup
```

## Production Checklist

- [ ] MongoDB 4.0+ installed
- [ ] Replica set configured
- [ ] Automated backups enabled
- [ ] Connection pool tuned for load
- [ ] Health checks enabled
- [ ] Indexes created for queries
- [ ] User authentication enabled
- [ ] Network security configured
- [ ] Monitoring and alerts set up
- [ ] Disaster recovery plan in place

## References

- [MongoDB Documentation](https://docs.mongodb.com/)
- [Mongoose Documentation](https://mongoosejs.com/)
- [NestJS MongoDB Integration](https://docs.nestjs.com/techniques/mongodb)
- [MongoDB Transactions](https://docs.mongodb.com/manual/transactions/)
- [MongoDB Replica Sets](https://docs.mongodb.com/manual/replication/)
