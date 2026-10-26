import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators';
import { UnsubscribeQueryDto } from './dto';
import { EmailUnsubscribeService } from './email-unsubscribe.service';

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  return `${local.slice(0, 1)}***@${domain}`;
}

@ApiTags('email-unsubscribe')
@Controller('email/unsubscribe')
export class EmailUnsubscribeController {
  constructor(private readonly service: EmailUnsubscribeService) {}

  /**
   * RFC 8058 one-click unsubscribe. Mail clients POST here directly
   * (body `List-Unsubscribe=One-Click`, token in the query string).
   * Always returns 200 so clients do not retry.
   */
  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'One-click unsubscribe (RFC 8058)' })
  async oneClick(
    @Query() query: UnsubscribeQueryDto,
  ): Promise<{ status: string }> {
    const result = await this.service.unsubscribeByToken(query.token);
    return { status: result.status };
  }

  /**
   * Read-only status for the confirmation page (web-public).
   */
  @Public()
  @Get('status')
  @ApiOperation({ summary: 'Unsubscribe token status' })
  async status(@Query() query: UnsubscribeQueryDto): Promise<
    | {
        valid: true;
        email: string;
        category: string;
        unsubscribed: boolean;
      }
    | { valid: false }
  > {
    const status = await this.service.statusByToken(query.token);
    if (!status.valid) {
      return { valid: false };
    }
    return {
      valid: true,
      email: maskEmail(status.email),
      category: status.category,
      unsubscribed: status.unsubscribed,
    };
  }
}
