import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TeamsService } from './teams.service';

@Controller('teams')
@UseGuards(AuthGuard('jwt'))
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  async getTeams() {
    return this.teamsService.getTeams();
  }

  @Get(':id')
  async getTeamById(@Param('id') id: string) {
    return this.teamsService.getTeamById(id);
  }

  @Post()
  async createTeam(@Body() createTeamDto: any) {
    return this.teamsService.createTeam(createTeamDto);
  }

  @Get(':id/members')
  async getTeamMembers(@Param('id') id: string) {
    return this.teamsService.getTeamMembers(id);
  }
}
