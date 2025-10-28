import { Controller, Get, Put, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { StoryMapService } from './story-map.service';

@Controller('map')
@UseGuards(AuthGuard('jwt'))
export class StoryMapController {
  constructor(private readonly storyMapService: StoryMapService) {}

  @Get()
  async getMap() {
    return this.storyMapService.getMap();
  }

  @Put()
  async updateMap(@Body() updateMapDto: any) {
    return this.storyMapService.updateMap(updateMapDto);
  }

  @Post('nodes')
  async addNode(@Body() createNodeDto: any) {
    return this.storyMapService.addNode(createNodeDto);
  }

  @Put('nodes/:id')
  async updateNode(@Param('id') nodeId: string, @Body() updateNodeDto: any) {
    return this.storyMapService.updateNode(nodeId, updateNodeDto);
  }

  @Delete('nodes/:id')
  async deleteNode(@Param('id') nodeId: string) {
    return this.storyMapService.deleteNode(nodeId);
  }

  @Post('edges')
  async addEdge(@Body() createEdgeDto: any) {
    return this.storyMapService.addEdge(createEdgeDto);
  }

  @Delete('edges/:id')
  async deleteEdge(@Param('id') edgeId: string) {
    return this.storyMapService.deleteEdge(edgeId);
  }
}
