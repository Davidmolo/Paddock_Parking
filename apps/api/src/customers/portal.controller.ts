import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { IsEmail, IsIn, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { CustomersService } from './customers.service.js';

class PortalLoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

class PortalSetPasswordDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  inviteToken?: string;
}

class PortalResetDto {
  @IsEmail()
  email!: string;
}

class PortalPlateDto {
  @IsEmail()
  email!: string;

  @IsInt()
  @Min(0)
  index!: number;

  @IsString()
  @MinLength(1)
  licensePlate!: string;
}

class PortalDocumentDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  fileName!: string;

  @IsIn(['lease', 'insurance', 'other'])
  kind!: 'lease' | 'insurance' | 'other';

  @IsString()
  @MinLength(1)
  contentBase64!: string;
}

@Controller('portal')
export class PortalController {
  constructor(private readonly customersService: CustomersService) {}

  @Post('login')
  login(@Body() dto: PortalLoginDto) {
    return this.customersService.portalLogin(dto);
  }

  @Get('home')
  home(@Query('email') email = '') {
    return this.customersService.portalHome(email);
  }

  @Post('set-password')
  setPassword(@Body() dto: PortalSetPasswordDto) {
    return this.customersService.portalSetPassword(dto);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: PortalResetDto) {
    return this.customersService.portalResetPassword(dto);
  }

  @Post('plate')
  savePlate(@Body() dto: PortalPlateDto) {
    return this.customersService.portalSavePlate(dto);
  }

  @Post('documents')
  uploadDocument(@Body() dto: PortalDocumentDto) {
    return this.customersService.portalUploadDocument(dto);
  }
}
