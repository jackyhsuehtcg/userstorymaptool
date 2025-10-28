import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StoryMapController } from './story-map.controller';
import { StoryMapService } from './story-map.service';
import { DataValidationService } from './services/data-validation.service';
import { HierarchyRepairService } from './services/hierarchy-repair.service';
import { NodeValidationGuard } from './guards/node-validation.guard';
import { EdgeValidationGuard } from './guards/edge-validation.guard';
import { NodeSchema } from './schemas/node.schema';
import { EdgeSchema } from './schemas/edge.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Node', schema: NodeSchema },
      { name: 'Edge', schema: EdgeSchema },
    ]),
  ],
  controllers: [StoryMapController],
  providers: [
    StoryMapService,
    DataValidationService,
    HierarchyRepairService,
    NodeValidationGuard,
    EdgeValidationGuard,
  ],
  exports: [
    StoryMapService,
    DataValidationService,
    HierarchyRepairService,
  ],
})
export class StoryMapModule {}
