import { Module } from '@nestjs/common';
import { StoryMapController } from './story-map.controller';
import { StoryMapService } from './story-map.service';

@Module({
  controllers: [StoryMapController],
  providers: [StoryMapService],
  exports: [StoryMapService],
})
export class StoryMapModule {}
