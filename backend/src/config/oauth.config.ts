import { registerAs } from '@nestjs/config';

export const oauthConfig = registerAs('oauth', () => ({
  tcrt: {
    clientId: process.env.OAUTH_CLIENT_ID || 'client-id',
    clientSecret: process.env.OAUTH_CLIENT_SECRET || 'client-secret',
    discoveryUrl: process.env.OAUTH_DISCOVERY_URL || 'https://oauth.example.com/.well-known/openid-configuration',
    redirectUri: process.env.OAUTH_REDIRECT_URI || 'http://localhost:3000/auth/callback',
    scope: process.env.OAUTH_SCOPE || 'openid profile email',
  },
}));
