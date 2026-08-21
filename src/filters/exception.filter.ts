import 'reflect-metadata';

import { Logger } from '../controllers/logger/index.ts';
import { Inject } from '../decorators/inject.ts';
import { Injectable } from '../decorators/injectable.ts';
import { ExceptionFilter, ExecutionContext } from '../types/index.ts';

export class HttpException extends Error {
  statusCode: number;
  errors?: unknown[];

  constructor(statusCode: number, message: string, errors?: unknown[]) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

export class BadRequestException extends HttpException {
  constructor(msg?: string, errors?: unknown[]) {
    super(400, msg ?? 'Bad Request', errors);
  }
}

export class NotFoundException extends HttpException {
  constructor(msg?: string) {
    super(404, msg ?? 'Not Found');
  }
}

export class ForbiddenException extends HttpException {
  constructor(msg?: string) {
    super(403, msg ?? 'Forbidden');
  }
}

const PROBLEM_BASE = '/problems';

const TITLES: Record<number, string> = {
  400: 'Bad Request',
  403: 'Forbidden',
  404: 'Not Found',
  500: 'Internal Server Error',
};

@Injectable()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(@Inject(Logger) private logger: Logger) {}

  catch(error: unknown, { req, res }: ExecutionContext): void {
    this.logger.error(error);

    const isHttpException = error instanceof HttpException;
    const status = isHttpException ? error.statusCode : 500;
    const detail = isHttpException
      ? error.message
      : 'An unexpected error occurred';
    const errors = isHttpException ? error.errors : undefined;

    const body = {
      type: `${PROBLEM_BASE}/${status}`,
      title: TITLES[status] ?? 'Error',
      status,
      detail,
      method: req.method ?? '',
      instance: req.url ?? '',
      ...(errors ? { errors } : {}),
    };

    res.writeHead(status, { 'Content-Type': 'application/problem+json' });
    res.end(JSON.stringify(body));
  }
}
