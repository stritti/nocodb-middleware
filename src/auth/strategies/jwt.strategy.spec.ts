import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-secret'),
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('constructor', () => {
    it('should throw when JWT_SECRET is missing', () => {
      expect(() =>
        new JwtStrategy({
          get: jest.fn().mockReturnValue(undefined),
        } as unknown as ConfigService),
      ).toThrow('JWT_SECRET is required');
    });
  });

  describe('validate', () => {
    it('should validate and return user data based on payload', async () => {
      const payload = { sub: 1, username: 'testuser', roles: ['admin'] };
      const result = await strategy.validate(payload);
      expect(result).toEqual({
        userId: 1,
        username: 'testuser',
        roles: ['admin'],
      });
    });
  });
});
