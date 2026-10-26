import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import type { Request } from 'express';
import type { RequestWithContext } from '../middleware/request-context.middleware';

interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  /**
   * Application-defined machine-readable code, surfaced when controllers/services
   * throw HttpExceptions with an object payload like `{ code, message }`. Frontend
   * UIs branch on `code` rather than parsing `message` so copy edits don't break
   * routing (see TicketViewService → empty-state mapping in the web client).
   */
  code?: string;
  /**
   * Optional structured details surfaced to the client (e.g. the conflicting
   * field, the existing colliding record). Mirrors the AGENDA_* error shape.
   */
  details?: unknown;
  timestamp: string;
  path: string;
  requestId?: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);
  private readonly isProduction = process.env.NODE_ENV === 'production';

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<RequestWithContext>();
    const path = httpAdapter.getRequestUrl(request);
    const requestId = request.requestId;

    const { statusCode, message, error, code, details } =
      this.getErrorDetails(exception);

    // Логируем только серверные ошибки с полным стеком
    if (statusCode >= 500) {
      this.logger.error(
        JSON.stringify({
          type: 'http_error',
          requestId,
          method: request.method,
          path,
          statusCode,
          message,
        }),
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else if (statusCode >= 400) {
      this.logger.warn(
        JSON.stringify({
          type: 'http_warning',
          requestId,
          method: request.method,
          path,
          statusCode,
          message,
        }),
      );
    }

    const responseBody: ErrorResponse = {
      statusCode,
      message,
      error,
      ...(code ? { code } : {}),
      ...(details !== undefined ? { details } : {}),
      timestamp: new Date().toISOString(),
      path,
      requestId,
    };

    httpAdapter.reply(ctx.getResponse(), responseBody, statusCode);
  }

  private getErrorDetails(exception: unknown): {
    statusCode: number;
    message: string;
    error: string;
    code?: string;
    details?: unknown;
  } {
    // HTTP исключения NestJS
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();

      let message: string;
      let code: string | undefined;
      let details: unknown;
      if (typeof response === 'string') {
        message = response;
      } else if (typeof response === 'object' && response !== null) {
        const responseObj = response as Record<string, unknown>;
        if (Array.isArray(responseObj.message)) {
          message = responseObj.message.join(', ');
        } else if (typeof responseObj.message === 'string') {
          message = responseObj.message;
        } else {
          message = exception.message;
        }
        // Preserve application-defined `code` so frontends can switch on it.
        if (typeof responseObj.code === 'string') {
          code = responseObj.code;
        }
        if (responseObj.details !== undefined) {
          details = responseObj.details;
        }
      } else {
        message = exception.message;
      }

      return {
        statusCode: status,
        message,
        error: HttpStatus[status] || 'Error',
        code,
        details,
      };
    }

    // Prisma ошибки
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.handlePrismaError(exception);
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      // Prisma message starts with "Invalid `prisma.<model>.<op>()` invocation:"
      // and contains a structured dump of the bad arguments. Surface the tail
      // (the actual reason like "Argument `duration` is missing") to the client
      // so users can act on it instead of seeing a generic validation toast.
      this.logger.warn(
        JSON.stringify({
          type: 'prisma_validation_error',
          message: exception.message,
        }),
      );
      const reason = this.extractPrismaValidationReason(exception.message);
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: reason ?? 'Ошибка валидации данных',
        error: 'Bad Request',
        // Полный prisma-message (модель, операция, дамп аргументов) — внутренняя
        // деталь схемы. Отдаём клиенту только вне production; в проде остаётся
        // только человекочитаемый reason в message (и полный текст — в логах).
        ...(this.isProduction
          ? {}
          : { details: { prismaMessage: exception.message } }),
      };
    }

    if (exception instanceof Prisma.PrismaClientInitializationError) {
      return {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'Сервис временно недоступен',
        error: 'Service Unavailable',
      };
    }

    // Неизвестные ошибки
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Внутренняя ошибка сервера',
      error: 'Internal Server Error',
    };
  }

  private handlePrismaError(error: Prisma.PrismaClientKnownRequestError): {
    statusCode: number;
    message: string;
    error: string;
  } {
    switch (error.code) {
      // Unique constraint violation
      case 'P2002': {
        const target = error.meta?.target;
        const field = Array.isArray(target)
          ? target.join(', ')
          : typeof target === 'string'
            ? target
            : null;
        return {
          statusCode: HttpStatus.CONFLICT,
          message: field
            ? `Запись с таким значением ${field} уже существует`
            : 'Запись с такими данными уже существует',
          error: 'Conflict',
        };
      }
      // Record not found
      case 'P2025':
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Запись не найдена',
          error: 'Not Found',
        };
      // Foreign key constraint violation
      case 'P2003':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Связанная запись не существует',
          error: 'Bad Request',
        };
      // Required field missing
      case 'P2011':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Обязательное поле не заполнено',
          error: 'Bad Request',
        };
      // Value too long
      case 'P2000':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Значение превышает допустимую длину',
          error: 'Bad Request',
        };
      // Invalid ID
      case 'P2023':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Неверный формат идентификатора',
          error: 'Bad Request',
        };
      // Required relation violation
      case 'P2014':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Нарушение связи между записями',
          error: 'Bad Request',
        };
      // Database access denied (wrong role, connection string)
      case 'P1010':
        return {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          message:
            'Нет доступа к базе данных. Проверьте настройки подключения.',
          error: 'Service Unavailable',
        };
      // Table does not exist (migrations not applied)
      case 'P2021':
        return {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          message:
            'База данных не обновлена. Выполните миграции (prisma migrate deploy).',
          error: 'Service Unavailable',
        };
      default:
        this.logger.warn(
          `Unhandled Prisma error: ${error.code} - ${JSON.stringify(error.meta)}`,
        );
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Ошибка базы данных',
          error: 'Internal Server Error',
        };
    }
  }

  /**
   * Pulls the human-readable tail out of a PrismaClientValidationError message.
   * Prisma dumps the full call site + a structured arg dump; the actual reason
   * lives on the last few lines and starts with one of a known set of prefixes
   * ("Argument `x`...", "Unknown argument...", "Invalid value..."). We return
   * the whole tail block (joined) so types + field name + got/expected are all
   * shown at once. Falls back to the very last non-empty line.
   */
  private extractPrismaValidationReason(raw: string): string | null {
    if (!raw) return null;
    // eslint-disable-next-line no-control-regex -- ANSI CSI-escape strip from Prisma stderr
    const stripped = raw.replace(/\u001b\[[0-9;]*m/g, '');
    const lines = stripped
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) return null;

    const reasonPrefixes = [
      'Argument',
      'Invalid',
      'Unknown',
      'Expected',
      'Got',
    ];
    const reasonLines: string[] = [];
    for (let i = lines.length - 1; i >= 0 && reasonLines.length < 4; i -= 1) {
      const line = lines[i];
      if (
        reasonPrefixes.some((prefix) => line.startsWith(prefix)) &&
        // Skip the "Invalid `prisma.x.y()` invocation" header.
        !line.startsWith('Invalid `prisma')
      ) {
        reasonLines.unshift(line);
      } else if (reasonLines.length > 0) {
        // Stop as soon as we leave the trailing reason block.
        break;
      }
    }

    if (reasonLines.length > 0) {
      return reasonLines.join(' ');
    }
    return lines[lines.length - 1] ?? null;
  }
}
