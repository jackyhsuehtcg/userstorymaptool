# Configuration Guide

## Overview

The User Story Map Tool backend uses a YAML-first configuration system with environment variable overrides. This approach provides a balance between version-controllable defaults and deployment-specific customization.

## Configuration Files

### Default Configuration: `config/default.example.yaml`

This file contains all available configuration options with example values. It is version-controlled and serves as a template and documentation reference.

**Important**: Never commit sensitive values (secrets, API keys, database credentials) to version control.

### Production Configuration: `config/default.yaml`

This file contains your actual configuration and **should NOT be committed to git** (it's in .gitignore).

To set up your local or production environment:

```bash
# Copy the example file
cp config/default.example.yaml config/default.yaml

# Edit with your actual values
nano config/default.yaml
```

## Configuration Loading Precedence

The application loads configuration in this order (later sources override earlier ones):

1. **Default values** in `config/default.example.yaml`
2. **YAML file** values from `config/default.yaml`
3. **Environment variables** with `CONFIG_` prefix (highest priority)

### Example

If you have in `config/default.yaml`:
```yaml
database:
  uri: mongodb://localhost:27017/story-map
```

And you set environment variable:
```bash
export CONFIG_DATABASE_URI=mongodb://production.host:27017/story-map
```

The environment variable will **override** the YAML file value.

## Environment Variable Overrides

### Pattern

Environment variables must follow this pattern:

```
CONFIG_{SECTION}_{SUBSECTION}_{KEY}=value
```

Convert nested paths to uppercase with underscores:

```yaml
# YAML path
database:
  connectionPool:
    maxPoolSize: 10

# Environment variable
CONFIG_DATABASE_CONNECTIONPOOL_MAXPOOLSIZE=20
```

### Type Parsing

Environment variables are automatically parsed:

| Value | Type |
|-------|------|
| `true` / `false` | Boolean |
| `123` / `45.67` | Number |
| `null` | Null |
| `undefined` | Undefined |
| `[1,2,3]` | JSON Array |
| `{"key":"value"}` | JSON Object |
| Anything else | String |

### Examples

```bash
# Boolean
export CONFIG_APP_CORS_ENABLED=true

# Number
export CONFIG_APP_PORT=3000

# String
export CONFIG_DATABASE_URI=mongodb://localhost:27017/story-map

# JSON
export CONFIG_OAUTH_TCRT_SCOPE='["openid","profile","email"]'
```

## Critical Configuration Fields

These fields are required in production:

- `app.port`
- `database.uri`
- `jwt.secret`

If missing in production, the application will throw an error on startup. In development, missing values only generate warnings.

## Configuration Sections

### `app`
- **port**: Server port (default: 3000)
- **nodeEnv**: Environment (development, production, test)
- **apiPrefix**: API route prefix (default: /api/v1)
- **cors**: CORS settings with origin URL for frontend

### `database`
- **uri**: MongoDB connection string
- **name**: Database name
- **options**: MongoDB driver options
- **connectionPool**: Min/max pool size
- **replicaSet**: Optional replica set name for transactions
- **healthCheck**: Health check settings

### `jwt`
- **secret**: JWT signing key (MUST BE CHANGED IN PRODUCTION)
- **expiresIn**: Access token lifetime (e.g., "24h")
- **refreshSecret**: Refresh token key
- **refreshExpiresIn**: Refresh token lifetime (e.g., "7d")

### `oauth`
- **tcrt.clientId**: OAuth application ID
- **tcrt.clientSecret**: OAuth application secret (MUST BE CHANGED IN PRODUCTION)
- **tcrt.discoveryUrl**: OIDC discovery endpoint
- **tcrt.redirectUri**: Callback URL for OAuth redirect
- **tcrt.scope**: OAuth scopes to request
- **tcrt.pkceEnabled**: Enable PKCE for enhanced security

### `audit`
- **enabled**: Enable audit logging
- **level**: Log level (all, changes, important)
- **retention**: Days to keep logs
- **maskFields**: Sensitive fields to mask in logs

### `security`
- **password**: Password policy requirements
- **sessionTimeout**: Session lifetime in ms
- **tokenExpiration**: Token lifetime in days
- **apiKeyValidation**: Enable API key validation

## Local Development Setup

1. **Copy example configuration**:
   ```bash
   cp config/default.example.yaml config/default.yaml
   ```

2. **Update for local environment**:
   ```yaml
   app:
     port: 3000
     nodeEnv: development

   database:
     uri: mongodb://localhost:27017/story-map

   jwt:
     secret: dev-secret-key-change-me
   ```

3. **Start the application**:
   ```bash
   npm run start:dev
   ```

## Production Deployment

### Using Config File

1. Copy example file to production server
2. Update all values, especially:
   - `database.uri` with production MongoDB connection
   - `jwt.secret` with a strong random key
   - `jwt.refreshSecret` with another strong random key
   - `oauth.tcrt.clientSecret` with production OAuth credentials
   - `app.cors.origin` with production frontend URL

### Using Environment Variables

Set configuration via environment:

```bash
export CONFIG_APP_NODEENV=production
export CONFIG_APP_PORT=3000
export CONFIG_DATABASE_URI=mongodb://prod-host:27017/story-map
export CONFIG_JWT_SECRET=$(openssl rand -base64 32)
export CONFIG_JWT_REFRESHSECRET=$(openssl rand -base64 32)
export CONFIG_OAUTH_TCRT_CLIENTSECRET=your-prod-secret
export CONFIG_APP_CORS_ORIGIN=https://yourdomain.com
```

### Docker Deployment

In your Dockerfile or docker-compose.yml:

```dockerfile
ENV CONFIG_DATABASE_URI=mongodb://mongo:27017/story-map
ENV CONFIG_JWT_SECRET=your-secret-here
ENV CONFIG_OAUTH_TCRT_CLIENTSECRET=your-oauth-secret
```

Or in docker-compose.yml:

```yaml
services:
  backend:
    environment:
      - CONFIG_DATABASE_URI=mongodb://mongo:27017/story-map
      - CONFIG_JWT_SECRET=your-secret-here
      - CONFIG_OAUTH_TCRT_CLIENTSECRET=your-oauth-secret
```

## Testing Configuration

Run the application with debug logging to verify configuration loading:

```bash
# Will output: ✓ Loaded config from /path/to/config/default.yaml
npm run start:dev
```

Check logs for any configuration warnings or validation errors.

## Accessing Configuration in Code

### In Controllers/Services

Using NestJS dependency injection:

```typescript
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MyService {
  constructor(private configService: ConfigService) {}

  getDbUri() {
    return this.configService.get<string>('database.uri');
  }

  getJwtSecret() {
    return this.configService.get<string>('jwt.secret');
  }
}
```

### Using ConfigLoader Directly

```typescript
import { ConfigLoader } from './config/config-loader';

const dbUri = ConfigLoader.getConfigValue('database.uri');
```

## Security Best Practices

1. **Never commit sensitive files**: `config/default.yaml`, `.env` files with secrets
2. **Use environment variables in production**: Never commit secrets to git
3. **Rotate secrets regularly**: Change JWT secrets, OAuth credentials periodically
4. **Use strong keys**: Generate with `openssl rand -base64 32`
5. **Mask sensitive logs**: Configure audit.maskFields for sensitive fields
6. **Validate in production**: Enable strict validation (app.nodeEnv = production)

## Troubleshooting

### Configuration not loading

Check that:
1. File path is correct (relative to project root)
2. File format is valid YAML
3. No circular references or invalid YAML syntax

### Environment variables not overriding

Verify:
1. Variable name follows pattern: `CONFIG_SECTION_KEY=value`
2. All uppercase with underscores
3. Variable is set before application starts
4. Check application logs for confirmation

### Missing required configuration error

In production, ensure these are set:
- `CONFIG_APP_PORT`
- `CONFIG_DATABASE_URI`
- `CONFIG_JWT_SECRET`

Or add them to `config/default.yaml`.

## Related Files

- `src/config/config-loader.ts` - Core configuration loading logic
- `src/config/configuration.ts` - Configuration factory for NestJS
- `src/app.module.ts` - Application module using configuration
- `config/default.example.yaml` - Configuration template
