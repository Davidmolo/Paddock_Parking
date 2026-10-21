import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { DataStoreService } from '../data/data-store.service.js';
import type { LoginDto } from './dto/login.dto.js';
import type {
  UpdatePasswordDto,
  UpdateProfileDto,
} from './dto/update-profile.dto.js';

export type AuthUser = {
  id: string;
  username: string;
  name: string;
  email: string;
  phone: string;
  role: string;
};

@Injectable()
export class AuthService {
  constructor(private readonly store: DataStoreService) {}

  login(dto: LoginDto): { token: string; user: AuthUser } {
    const user = this.store.user;
    if (dto.username !== user.username || dto.password !== user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return {
      token: Buffer.from(user.id, 'utf8').toString('base64'),
      user: this.toPublic(user),
    };
  }

  meFromToken(authHeader: string | undefined): AuthUser {
    this.requireUser(authHeader);
    return this.toPublic(this.store.user);
  }

  updateProfile(
    authHeader: string | undefined,
    dto: UpdateProfileDto,
  ): AuthUser {
    this.requireUser(authHeader);
    this.store.user.name = dto.name.trim();
    this.store.user.email = dto.email.trim();
    if (dto.phone !== undefined) this.store.user.phone = dto.phone.trim();
    return this.toPublic(this.store.user);
  }

  updatePassword(authHeader: string | undefined, dto: UpdatePasswordDto) {
    this.requireUser(authHeader);
    if (dto.currentPassword !== this.store.user.password) {
      throw new BadRequestException('Current password is incorrect');
    }
    if (dto.newPassword === dto.currentPassword) {
      throw new BadRequestException(
        'New password must be different from the current password',
      );
    }
    this.store.user.password = dto.newPassword;
    return { ok: true };
  }

  private requireUser(authHeader: string | undefined) {
    const token = this.extractBearer(authHeader);
    const id = Buffer.from(token, 'base64').toString('utf8');
    if (id !== this.store.user.id) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private toPublic(user: (typeof this.store.user)): AuthUser {
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    };
  }

  private extractBearer(authHeader: string | undefined): string {
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Missing or invalid Authorization header',
      );
    }
    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) {
      throw new UnauthorizedException('Missing token');
    }
    return token;
  }
}
