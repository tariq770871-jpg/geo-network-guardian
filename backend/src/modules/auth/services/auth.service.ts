import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async register(email: string, password: string, fullName: string) {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictException('البريد الإلكتروني مستخدم بالفعل');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const defaultRole = await prisma.role.findFirst({
      where: { name: 'user' },
    });

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        roleId: defaultRole?.id || 'default',
      },
    });

    const token = this.jwtService.sign({ sub: user.id, email: user.email });

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
    };
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('بيانات الدخول غير صحيحة');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('بيانات الدخول غير صحيحة');
    }

    const token = this.jwtService.sign({ sub: user.id, email: user.email });

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
    };
  }
}
