import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TokensService } from './tokens.service';

@Controller('tokens')
@UseGuards(AuthGuard('jwt'))
export class TokensController {
  constructor(private readonly tokensService: TokensService) {}

  @Get()
  async getTokens() {
    return this.tokensService.getTokens();
  }

  @Post()
  async createToken(@Body() createTokenDto: any) {
    return this.tokensService.createToken(createTokenDto);
  }

  @Get(':id')
  async getTokenById(@Param('id') id: string) {
    return this.tokensService.getTokenById(id);
  }

  @Delete(':id')
  async revokeToken(@Param('id') id: string) {
    return this.tokensService.revokeToken(id);
  }

  @Post(':id/rotate')
  async rotateToken(@Param('id') id: string) {
    return this.tokensService.rotateToken(id);
  }
}
