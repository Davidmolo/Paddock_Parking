import { Module } from '@nestjs/common';
import { YardsController } from './yards.controller.js';

@Module({
  controllers: [YardsController],
})
export class YardsModule {}
