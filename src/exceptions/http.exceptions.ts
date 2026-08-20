export class HttpError extends Error {
  statusCode: number;
  errors?: unknown[];

  constructor(statusCode: number, errors?: unknown[]) {
    super(`HTTP Error: ${statusCode}`);
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

export class NotFoundException extends HttpError {
  constructor(msg?: string) {
    super(404, [{ message: msg ?? 'Not Found' }]);
  }
}

export class ForbiddenException extends HttpError {
  constructor(msg?: string) {
    super(403, [{ message: msg ?? 'Forbidden' }]);
  }
}
