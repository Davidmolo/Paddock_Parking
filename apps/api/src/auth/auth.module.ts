import { Module } from '@nestjs/common';
import { DataModule } from '../data/data.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

@Module({
  imports: [DataModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
