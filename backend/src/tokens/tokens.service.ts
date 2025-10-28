import { Injectable } from '@nestjs/common';

@Injectable()
export class TokensService {
  // TODO: Inject TokenRepository when created

  async getTokens() {
    // TODO: Fetch all API tokens for current user
    return [];
  }

  async createToken(createTokenDto: any) {
    // TODO: Generate SHA-256 hashed token
    // TODO: Store hashed token in MongoDB
    // TODO: Return token value only once
    return {
      id: 'token-id',
      name: createTokenDto.name,
      value: 'token-value-shown-only-once',
      createdAt: new Date(),
    };
  }

  async getTokenById(id: string) {
    // TODO: Fetch token metadata (without actual value)
    return {
      id,
      name: 'Token Name',
      createdAt: new Date(),
      lastUsed: null,
    };
  }

  async revokeToken(id: string) {
    // TODO: Revoke token (set active=false)
    return { success: true };
  }

  async rotateToken(id: string) {
    // TODO: Rotate token (revoke old, create new)
    return {
      id: 'new-token-id',
      value: 'new-token-value',
      createdAt: new Date(),
    };
  }
}
