import { TokenService } from './token.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';

describe('TokenService Unit Tests', () => {
  let tokenService: TokenService;
  let jwtService: JwtService;
  let configService: ConfigService;

  beforeEach(() => {
    jwtService = new JwtService({});
    configService = {
      get: jest.fn().mockImplementation((key: string, defaultVal: string) => defaultVal),
    } as any;

    tokenService = new TokenService(jwtService, configService);
  });

  it('should generate an opaque random refresh token and hash it with sha256', () => {
    const refreshToken = tokenService.generateRefreshToken();
    expect(refreshToken).toBeDefined();
    expect(refreshToken.length).toBe(64); // 32 bytes hex = 64 chars

    const hash1 = tokenService.hashRefreshToken(refreshToken);
    const hash2 = tokenService.hashRefreshToken(refreshToken);
    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(refreshToken);
  });

  it('should sign and verify access token with sub, role, and sessionId', async () => {
    const payload = {
      sub: 'user-uuid-123',
      role: UserRole.PHARMACIST,
      sessionId: 'session-uuid-456',
    };

    const token = await tokenService.signAccessToken(payload);
    expect(token).toBeDefined();

    const decoded = await tokenService.verifyAccessToken(token);
    expect(decoded.sub).toBe(payload.sub);
    expect(decoded.role).toBe(payload.role);
    expect(decoded.sessionId).toBe(payload.sessionId);
  });
});
