import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { TokensResponseDto } from './dto';

const EXCHANGE_TTL_MS = 2 * 60 * 1000;

@Injectable()
export class MobileOAuthExchangeService {
  private readonly encryptionKey: Buffer;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.encryptionKey = createHash('sha256')
      .update(`mobile-oauth:${config.getOrThrow<string>('jwt.secret')}`)
      .digest();
  }

  async issue(tokens: TokensResponseDto): Promise<string> {
    const code = randomBytes(32).toString('base64url');
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const ciphertext = Buffer.concat([
      cipher.update(JSON.stringify(tokens), 'utf8'),
      cipher.final(),
    ]);

    await this.prisma.mobileOAuthExchange.create({
      data: {
        codeHash: hashCode(code),
        ciphertext: ciphertext.toString('base64'),
        iv: iv.toString('base64'),
        authTag: cipher.getAuthTag().toString('base64'),
        expiresAt: new Date(Date.now() + EXCHANGE_TTL_MS),
      },
    });
    return code;
  }

  async consume(code: string): Promise<TokensResponseDto> {
    let exchange;
    try {
      // Delete is the compare-and-swap: concurrent/replayed exchanges have
      // exactly one winner and no reusable row remains after decryption.
      exchange = await this.prisma.mobileOAuthExchange.delete({
        where: { codeHash: hashCode(code) },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError ||
        (typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          error.code === 'P2025')
      ) {
        throw denied();
      }
      throw error;
    }

    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.encryptionKey,
      Buffer.from(exchange.iv, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(exchange.authTag, 'base64'));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(exchange.ciphertext, 'base64')),
      decipher.final(),
    ]).toString('utf8');
    const tokens = JSON.parse(plaintext) as TokensResponseDto;

    if (exchange.expiresAt.getTime() <= Date.now()) {
      await this.prisma.refreshToken.updateMany({
        where: { token: hashCode(tokens.refreshToken) },
        data: { revokedAt: new Date() },
      });
      throw denied();
    }
    return tokens;
  }
}

function hashCode(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function denied(): UnauthorizedException {
  return new UnauthorizedException({
    code: 'OAUTH_EXCHANGE_INVALID',
    message: 'OAuth exchange недействителен или уже использован',
  });
}
