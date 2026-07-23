import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthenticatedUser, JwtPayload } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException('An account with this email already exists.');
    }

    const passwordHash = await hash(dto.password, 12);

    const user = await this.prisma.$transaction(async (transaction) => {
      const customerRole = await transaction.role.upsert({
        where: { name: 'customer' },
        update: {},
        create: {
          name: 'customer',
          description: 'Storefront customer',
        },
      });

      return transaction.user.create({
        data: {
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          roles: { connect: { id: customerRole.id } },
          cart: { create: {} },
          wishlist: { create: {} },
        },
        select: this.userSelect,
      });
    });

    return this.createSession(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { ...this.userSelect, passwordHash: true, status: true },
    });

    const passwordMatches = user
      ? await compare(dto.password, user.passwordHash)
      : false;

    if (!user || !passwordMatches || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid email or password.');
    }
    return this.createSession({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles,
    });
  }

  private readonly userSelect = {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
    roles: { select: { name: true } },
  } as const;

  private async createSession(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: { name: string }[];
  }) {
    const safeUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles.map((role) => role.name),
    };
    const payload: JwtPayload = {
      sub: safeUser.id,
      email: safeUser.email,
      roles: safeUser.roles,
    };

    return {
      accessToken: await this.jwt.signAsync(payload),
      user: safeUser,
    };
  }
}
