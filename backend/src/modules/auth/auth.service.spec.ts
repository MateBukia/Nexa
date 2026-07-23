import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash } from 'bcryptjs';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const findUnique = jest.fn();
  const signAsync = jest.fn().mockResolvedValue('signed-token');
  const prisma = {
    user: { findUnique },
  } as unknown as PrismaService;
  const jwt = { signAsync } as unknown as JwtService;
  const service = new AuthService(prisma, jwt);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a safe session for valid credentials', async () => {
    findUnique.mockResolvedValue({
      id: 'user-id',
      email: 'customer@example.com',
      firstName: 'Nino',
      lastName: 'Customer',
      passwordHash: await hash('Commerce123!', 4),
      status: 'ACTIVE',
      roles: [{ name: 'customer' }],
    });

    const result = await service.login({
      email: 'customer@example.com',
      password: 'Commerce123!',
    });

    expect(result).toEqual({
      accessToken: 'signed-token',
      user: {
        id: 'user-id',
        email: 'customer@example.com',
        firstName: 'Nino',
        lastName: 'Customer',
        roles: ['customer'],
      },
    });
    expect(signAsync).toHaveBeenCalledWith({
      sub: 'user-id',
      email: 'customer@example.com',
      roles: ['customer'],
    });
  });

  it('does not reveal whether an account exists', async () => {
    findUnique.mockResolvedValue(null);

    await expect(
      service.login({ email: 'missing@example.com', password: 'wrongpass' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
