# Code Style and Conventions

## TypeScript
- **Language**: TypeScript 5.9 (strict mode recommended)
- **Naming Conventions**:
  - Classes: PascalCase (e.g., `UserService`, `StoryMapController`)
  - Functions/Methods: camelCase
  - Constants: UPPER_SNAKE_CASE
  - Interfaces: PascalCase with 'I' prefix or descriptive names
  - Types: PascalCase
  - Variables: camelCase

## NestJS (Backend)
- **Module Structure**: Feature-based (auth, teams, story-map, audit, config)
- **Service Pattern**: Services handle business logic, Controllers handle HTTP routing
- **Decorators**: Use @Injectable(), @Controller(), @Get(), @Post(), etc.
- **Dependency Injection**: Constructor-based injection
- **Guards**: Use custom guards for role-based access control
- **Pipes**: Use class-validator for DTO validation

## React/Frontend
- **Components**: Functional components with hooks
- **State Management**: Zustand for global state
- **File Structure**: Components organized by feature
- **Naming**: PascalCase for components, camelCase for hooks/utilities
- **JSDoc**: Use TypeScript JSDoc for complex functions

## Documentation
- **Comments**: JSDoc format for functions and classes
- **READMEs**: Markdown files in major directories
- **API Docs**: Document endpoints, parameters, and responses
- **Configuration**: Document all config options in YAML example files

## Code Quality
- **Linting**: ESLint enabled
- **Formatting**: Consistent indentation (2 spaces standard)
- **Error Handling**: Use try-catch in services, throw BadRequestException/NotFoundException etc in NestJS
- **Logging**: Use Logger service in NestJS for all important operations
- **Testing**: Jest for backend tests, Vitest for frontend tests (when applicable)

## Security Practices
- TCRT token never exposed to frontend
- Local JWT self-signed and verified
- Session with automatic expiration
- Role checks on every protected request
- Audit logging for all important operations
- SHA-256 hashing for API tokens
