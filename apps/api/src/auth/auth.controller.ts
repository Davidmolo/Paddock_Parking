import { Body, Controller, Get, Headers, Patch, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import {
  UpdatePasswordDto,
  UpdateProfileDto,
} from './dto/update-profile.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  me(@Headers('authorization') authorization: string | undefined) {
    return this.authService.meFromToken(authorization);
  }

  @Patch('profile')
  updateProfile(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(authorization, dto);
  }

  @Patch('password')
  updatePassword(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: UpdatePasswordDto,
  ) {
    return this.authService.updatePassword(authorization, dto);
  }
}
