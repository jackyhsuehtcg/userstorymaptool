# User Story Map Tool - Backend

A NestJS-based backend for the User Story Map Tool, providing RESTful APIs for managing user story maps with team collaboration features.

## Features

- **Modular Architecture**: Separate modules for Auth, Teams, StoryMap, Tokens, and Audit
- **Authentication**: JWT-based auth with OAuth/OIDC support
- **Database**: MongoDB integration with Mongoose
- **API Token Management**: Create, revoke, and rotate API tokens
- **Audit Logging**: Track all operations and changes
- **Team Management**: Multi-team support with role-based access control
- **Story Map Operations**: Full CRUD operations for nodes and edges

## Project Structure

```
src/
├── config/              # Configuration files
│   ├── app.config.ts
│   ├── database.config.ts
│   ├── jwt.config.ts
│   └── oauth.config.ts
├── auth/                # Authentication module
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.module.ts
│   └── strategies/
│       └── jwt.strategy.ts
├── teams/               # Teams module
│   ├── teams.controller.ts
│   ├── teams.service.ts
│   └── teams.module.ts
├── story-map/           # Story Map operations module
│   ├── story-map.controller.ts
│   ├── story-map.service.ts
│   └── story-map.module.ts
├── tokens/              # API Token management module
│   ├── tokens.controller.ts
│   ├── tokens.service.ts
│   └── tokens.module.ts
├── audit/               # Audit logging module
│   ├── audit.controller.ts
│   ├── audit.service.ts
│   └── audit.module.ts
├── common/              # Shared utilities
│   ├── decorators/
│   ├── filters/
│   ├── interceptors/
│   ├── middleware/
│   └── dto/
├── app.module.ts        # Root application module
├── app.controller.ts
├── app.service.ts
└── main.ts              # Application entry point
```

## Installation

```bash
# Install dependencies
npm install
```

## Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update environment variables in `.env` with your configuration:
   - Database URI
   - JWT secrets
   - OAuth configuration
   - Port and API prefix

## Running the Application

### Development

```bash
npm run start:dev
```

The application will start in watch mode on `http://localhost:3000/api/v1`

### Debug

```bash
npm run start:debug
```

### Production

```bash
npm run build
npm run start
```

## API Endpoints

### Health Check
- `GET /health` - Health check endpoint
- `GET /` - Application info

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout
- `GET /api/v1/auth/profile` - Get user profile
- `POST /api/v1/auth/refresh` - Refresh access token

### Teams
- `GET /api/v1/teams` - Get all teams
- `GET /api/v1/teams/:id` - Get team by ID
- `POST /api/v1/teams` - Create new team
- `GET /api/v1/teams/:id/members` - Get team members

### Story Map
- `GET /api/v1/map` - Get complete map
- `PUT /api/v1/map` - Update map
- `POST /api/v1/map/nodes` - Create node
- `PUT /api/v1/map/nodes/:id` - Update node
- `DELETE /api/v1/map/nodes/:id` - Delete node
- `POST /api/v1/map/edges` - Create edge
- `DELETE /api/v1/map/edges/:id` - Delete edge

### API Tokens
- `GET /api/v1/tokens` - List API tokens
- `POST /api/v1/tokens` - Create new token
- `GET /api/v1/tokens/:id` - Get token details
- `DELETE /api/v1/tokens/:id` - Revoke token
- `POST /api/v1/tokens/:id/rotate` - Rotate token

### Audit Logs
- `GET /api/v1/audit` - Get audit logs with filters
- `GET /api/v1/audit/stats` - Get audit statistics

## Testing

```bash
# Run tests
npm run test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:cov
```

## Linting

```bash
npm run lint
```

## Dependencies

### Core Framework
- `@nestjs/core` - NestJS core framework
- `@nestjs/common` - Common NestJS utilities
- `@nestjs/config` - Configuration management

### Database
- `mongoose` - MongoDB ODM
- `@nestjs/mongoose` - Mongoose integration for NestJS

### Authentication
- `@nestjs/jwt` - JWT authentication
- `@nestjs/passport` - Passport authentication
- `passport` - Authentication middleware
- `passport-jwt` - JWT strategy for Passport
- `bcryptjs` - Password hashing

### Validation
- `class-validator` - Data validation
- `class-transformer` - Data transformation

### Environment
- `dotenv` - Environment variable management
- `joi` - Schema validation

### Utilities
- `reflect-metadata` - Metadata reflection
- `rxjs` - Reactive programming library

## Development Dependencies

- `@nestjs/cli` - NestJS CLI
- `typescript` - TypeScript compiler
- `ts-loader` - TypeScript loader for webpack
- `ts-node` - TypeScript execution for Node.js
- `nodemon` - File change monitoring

## TODO

The following features are yet to be implemented:

- [ ] MongoDB schema definitions and migrations
- [ ] Data validation layer (ancestorPath, parentId, etc.)
- [ ] TCRT OAuth/OIDC callback handling
- [ ] API rate limiting
- [ ] Swagger/OpenAPI documentation
- [ ] Unit and integration tests
- [ ] Error handling and custom exceptions
- [ ] Request logging middleware
- [ ] Database transaction support

## License

ISC
