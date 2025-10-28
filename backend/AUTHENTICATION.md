# Authentication & Authorization Guide

This guide explains the authentication and authorization system for the Story Map Tool, including OAuth/OIDC integration with TCRT, session management, and role-based access control.

## Overview

The authentication system provides:

1. **OAuth/OIDC Integration** - Seamless integration with TCRT authentication server
2. **Session Management** - Persistent user sessions with automatic cleanup
3. **JWT Token Generation** - Secure token-based authentication
4. **Role-Based Access Control** - Fine-grained permission control using storymap.* roles
5. **Audit Logging** - Complete audit trail of all authentication events

## Architecture

### Components

#### TcrtOAuthService
Handles all TCRT OAuth/OIDC communication:
- Authorization code exchange
- Token refresh
- User profile retrieval
- Team synchronization
- Token validation and revocation

#### SessionService
Manages user sessions:
- Session creation and validation
- Session expiration tracking
- Automatic cleanup of expired sessions
- Activity tracking
- Supports PKCE (Proof Key for Code Exchange)

#### AuthService
Orchestrates authentication flow:
- OAuth login initiation
- Callback handling
- JWT token generation
- Session management
- Team sync
- Permission checking

#### RolesGuard
Enforces role-based access control:
- Validates storymap.* roles
- Supports wildcard patterns
- Automatic permission checking on protected routes

#### AuditService
Logs all authentication events:
- Login/logout events
- Token operations
- Failed attempts
- Permission denials
- Team synchronization

## Configuration

Add OAuth configuration to `config/default.yaml`:

```yaml
oauth:
  # TCRT OAuth Endpoints
  clientId: 'your-client-id'
  clientSecret: 'your-client-secret'
  authorizationEndpoint: 'https://tcrt.example.com/oauth/authorize'
  tokenEndpoint: 'https://tcrt.example.com/oauth/token'
  userInfoEndpoint: 'https://tcrt.example.com/oauth/userinfo'
  teamsEndpoint: 'https://tcrt.example.com/api/teams'
  introspectionEndpoint: 'https://tcrt.example.com/oauth/introspect'
  revocationEndpoint: 'https://tcrt.example.com/oauth/revoke'

  # OAuth Configuration
  redirectUri: 'http://localhost:8787/auth/callback'
  usePkce: true
  requestTimeout: 10000

jwt:
  secret: 'your-jwt-secret'
  expiresIn: '1h'
  refreshExpiresIn: '7d'

auth:
  sessionCleanupInterval: 3600000  # 1 hour
```

## OAuth/OIDC Flow

### Step 1: Initiate Login

Frontend calls `/api/v1/auth/login/initiate`:

```bash
POST /api/v1/auth/login/initiate
```

Response:
```json
{
  "authorizationUrl": "https://tcrt.example.com/oauth/authorize?...",
  "state": "random-csrf-token",
  "codeVerifier": "pkce-code-verifier"
}
```

Frontend stores `state` and `codeVerifier` in sessionStorage, then redirects user to `authorizationUrl`.

### Step 2: User Authentication

User logs in to TCRT, grants permission, and is redirected back to:

```
http://localhost:8787/auth/callback?code=AUTH_CODE&state=STATE
```

### Step 3: Handle Callback

Frontend extracts code and state, calls `/api/v1/auth/oauth/callback`:

```bash
POST /api/v1/auth/oauth/callback
Content-Type: application/json

{
  "code": "authorization-code",
  "state": "received-state",
  "storedState": "previously-stored-state",
  "codeVerifier": "pkce-code-verifier"
}
```

Response:
```json
{
  "accessToken": "jwt-token",
  "refreshToken": "refresh-token",
  "expiresIn": 3600,
  "sessionId": "session-id",
  "user": {
    "id": "user-id",
    "username": "john.doe",
    "email": "john@example.com",
    "displayName": "John Doe",
    "roles": ["storymap.editor", "storymap.viewer"],
    "teams": [
      {
        "id": "team-1",
        "name": "Team A",
        "active": true
      }
    ]
  }
}
```

## API Endpoints

### Authentication Endpoints

#### 1. Initiate Login
```
POST /api/v1/auth/login/initiate
```

Returns authorization URL and CSRF state.

#### 2. OAuth Callback
```
POST /api/v1/auth/oauth/callback
```

Handles OAuth callback with authorization code.

**Request:**
```json
{
  "code": "authorization-code",
  "state": "state-parameter",
  "storedState": "stored-state",
  "codeVerifier": "pkce-code-verifier"
}
```

#### 3. Get Profile
```
GET /api/v1/auth/profile
Authorization: Bearer {JWT_TOKEN}
```

Returns current user profile.

#### 4. Refresh Token
```
POST /api/v1/auth/refresh
```

**Request:**
```json
{
  "sessionId": "session-id"
}
```

Returns new access token.

#### 5. Logout
```
POST /api/v1/auth/logout
Authorization: Bearer {JWT_TOKEN}
```

**Request:**
```json
{
  "sessionId": "session-id",
  "refreshToken": "refresh-token"
}
```

#### 6. Session Status
```
GET /api/v1/auth/session/status
Authorization: Bearer {JWT_TOKEN}
```

Quick check if session is valid.

#### 7. Logout All Sessions
```
POST /api/v1/auth/logout-all
Authorization: Bearer {JWT_TOKEN}
```

**Request:**
```json
{
  "currentSessionId": "session-id"
}
```

Invalidates all sessions for the user.

#### 8. Sync Teams
```
POST /api/v1/auth/teams/sync
Authorization: Bearer {JWT_TOKEN}
```

Synchronizes teams from TCRT. Requires `storymap.*` role.

## Role-Based Access Control

### Role Format

Roles use the format `storymap.{permission}`:

- `storymap.admin` - Full administrative access
- `storymap.editor` - Can create/edit nodes and edges
- `storymap.viewer` - Read-only access
- `storymap.export` - Can export data
- `storymap.import` - Can import data

### Using Roles in Controllers

```typescript
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard, Roles } from './guards/roles.guard';

@Controller('api/v1/map')
export class MapController {
  // Requires any storymap.* role
  @Post('nodes')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('storymap.editor')
  createNode() {
    // Implementation
  }

  // Requires specific role
  @Post('import')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('storymap.import')
  importData() {
    // Implementation
  }

  // Allows multiple roles
  @Delete('nodes/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(['storymap.editor', 'storymap.admin'])
  deleteNode() {
    // Implementation
  }

  // Wildcard pattern
  @Get('teams/sync')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('storymap.*')
  syncTeams() {
    // Implementation
  }
}
```

## JWT Token Structure

The JWT token contains the following claims:

```json
{
  "sub": "user-id",
  "username": "john.doe",
  "email": "john@example.com",
  "displayName": "John Doe",
  "roles": ["storymap.editor", "storymap.viewer"],
  "teams": [
    {
      "id": "team-1",
      "name": "Team A",
      "active": true
    }
  ],
  "iat": 1234567890,
  "exp": 1234571490
}
```

## Session Management

### Session Schema

Sessions are stored in MongoDB with:

```typescript
{
  userId: string          // User ID from TCRT
  teamId?: string         // Current team ID
  accessToken: string     // JWT token
  refreshToken?: string   // TCRT refresh token
  tokenExpiresAt: Date    // When access token expires
  refreshTokenExpiresAt?: Date
  lastActivity: Date      // Last request timestamp
  ipAddress: string       // Client IP
  userAgent: string       // Client user agent
  state?: string          // OAuth state for CSRF
  codeVerifier?: string   // PKCE code verifier
  active: boolean         // Session validity
  createdAt: Date
  updatedAt: Date
}
```

### Session Lifecycle

1. **Creation** - Session created upon successful OAuth callback
2. **Activity Tracking** - `lastActivity` updated on each request
3. **Token Refresh** - Session updated with new tokens
4. **Expiration** - Session marked as inactive when tokens expire
5. **Cleanup** - Expired sessions deleted automatically (hourly by default)

## Security Features

### CSRF Protection

- OAuth `state` parameter prevents CSRF attacks
- State is generated using cryptographically secure random number generator
- State must match between request and callback

### PKCE (Proof Key for Code Exchange)

- Code verifier generated for each authorization request
- Code challenge sent in authorization request
- Code verifier sent in token exchange for additional security
- Prevents authorization code interception attacks

### Token Security

- Access tokens are JWTs signed with RS256 or HS256
- Refresh tokens stored securely (hashed in database)
- Token rotation on refresh
- Automatic token expiration
- Token revocation support

### Session Security

- Session IDs are unique MongoDB ObjectIds
- IP address and user agent stored for audit purposes
- Sessions automatically cleaned up after expiration
- Support for logout-all to invalidate all sessions

## Error Handling

### Common Errors

#### 1. Invalid State Parameter
```json
{
  "statusCode": 400,
  "message": "Invalid state parameter"
}
```

**Solution:** State mismatch between request and storage. Ensure frontend stores and validates state correctly.

#### 2. Insufficient Permissions
```json
{
  "statusCode": 403,
  "message": "Insufficient permissions. Required roles: storymap.editor"
}
```

**Solution:** User lacks required role. Check TCRT role assignment.

#### 3. Session Expired
```json
{
  "statusCode": 401,
  "message": "Session expired or refresh token not available"
}
```

**Solution:** Token expired. Call refresh endpoint or re-login.

#### 4. Unauthorized
```json
{
  "statusCode": 401,
  "message": "User does not have permission to access Story Map Tool"
}
```

**Solution:** User not assigned any storymap.* role in TCRT.

## Frontend Integration

### Login Flow

```typescript
// 1. Initiate login
const response = await fetch('/api/v1/auth/login/initiate', { method: 'POST' });
const { authorizationUrl, state, codeVerifier } = await response.json();

// 2. Store state and code verifier
sessionStorage.setItem('oauth_state', state);
sessionStorage.setItem('oauth_code_verifier', codeVerifier);

// 3. Redirect to TCRT
window.location.href = authorizationUrl;
```

### Callback Handler

```typescript
// 1. Extract code and state from URL
const params = new URLSearchParams(window.location.search);
const code = params.get('code');
const state = params.get('state');

// 2. Get stored values
const storedState = sessionStorage.getItem('oauth_state');
const codeVerifier = sessionStorage.getItem('oauth_code_verifier');

// 3. Exchange for token
const response = await fetch('/api/v1/auth/oauth/callback', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code, state, storedState, codeVerifier }),
});

const { accessToken, sessionId, user } = await response.json();

// 4. Store tokens and redirect
localStorage.setItem('jwt_token', accessToken);
localStorage.setItem('session_id', sessionId);
window.location.href = '/map';
```

### Token Refresh

```typescript
// When token is about to expire
const sessionId = localStorage.getItem('session_id');
const response = await fetch('/api/v1/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sessionId }),
});

const { accessToken } = await response.json();
localStorage.setItem('jwt_token', accessToken);
```

### Logout

```typescript
const sessionId = localStorage.getItem('session_id');
const jwtToken = localStorage.getItem('jwt_token');

await fetch('/api/v1/auth/logout', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwtToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ sessionId }),
});

localStorage.removeItem('jwt_token');
localStorage.removeItem('session_id');
window.location.href = '/login';
```

## Audit Logging

All authentication events are logged for compliance and debugging:

- `LOGIN` - Successful login
- `LOGIN_FAILED` - Failed login attempt
- `LOGOUT` - User logout
- `TOKEN_REFRESH` - Token refresh
- `SESSION_EXPIRED` - Session timeout
- `TEAM_SYNC` - Team synchronization
- `TEAM_SYNC_FAILED` - Team sync failure
- `PERMISSION_DENIED` - Access denied
- `TOKEN_CREATE` - API token created
- `TOKEN_REVOKE` - API token revoked

Access logs via `/api/v1/audit/logs?action=LOGIN`.

## Best Practices

1. **Never Store Tokens in Cookies** - Use httpOnly cookies for refresh tokens only
2. **Always Validate State** - Prevent CSRF attacks by validating OAuth state
3. **Use PKCE** - Enable PKCE for public clients (SPAs)
4. **Token Expiration** - Keep access tokens short-lived (1 hour)
5. **Refresh Token Rotation** - Rotate refresh tokens on each refresh
6. **Session Cleanup** - Implement automatic cleanup of expired sessions
7. **Audit Logging** - Log all authentication events
8. **Role Validation** - Always validate user roles before operations
9. **Secure Communication** - Always use HTTPS in production
10. **Error Messages** - Avoid leaking sensitive information in error messages

## Troubleshooting

### State Mismatch
**Problem:** "Invalid state parameter" error
**Solution:** Ensure frontend stores state in sessionStorage, not localStorage (survived reload)

### Missing Roles
**Problem:** "Insufficient permissions" error
**Solution:** Verify user has storymap.* role assigned in TCRT

### Token Expiration
**Problem:** "Session expired" error
**Solution:** Implement automatic token refresh before expiration

### TCRT Connection Error
**Problem:** "Failed to exchange authorization code for token"
**Solution:** Verify OAuth endpoints in configuration, check network connectivity

## References

- [OAuth 2.0 Authorization Code Flow](https://tools.ietf.org/html/rfc6749#section-1.3.1)
- [PKCE (RFC 7636)](https://tools.ietf.org/html/rfc7636)
- [OpenID Connect](https://openid.net/specs/openid-connect-core-1_0.html)
- [JWT (RFC 7519)](https://tools.ietf.org/html/rfc7519)
