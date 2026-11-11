import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsArray, IsEmail, IsIn, IsInt, IsNumber, IsString, Min, MinLength, ValidateNested } from 'class-validator';
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

  @IsString()
  @MinLength(16)
  inviteToken!: string;
}

class PortalResetDto {
  @IsEmail()
  email!: string;
}

class PortalPlateItemDto {
  @IsInt()
  @Min(0)
  index!: number;

  @IsString()
  @MinLength(1)
  licensePlate!: string;
}

class PortalPlatesDto {
  @IsEmail()
  email!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PortalPlateItemDto)
  plates!: PortalPlateItemDto[];
}

class PortalPayDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  invoiceId!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsIn(['card', 'ach'])
  method!: 'card' | 'ach';

  @IsString()
  @MinLength(4)
  last4!: string;
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

  @Post('plates')
  savePlates(@Body() dto: PortalPlatesDto) {
    return this.customersService.portalSavePlates(dto);
  }

  @Post('pay')
  pay(@Body() dto: PortalPayDto) {
    return this.customersService.portalPay(dto);
  }

  @Post('documents')
  uploadDocument(@Body() dto: PortalDocumentDto) {
    return this.customersService.portalUploadDocument(dto);
  }
}
