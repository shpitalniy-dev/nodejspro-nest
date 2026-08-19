export class HttpError extends Error {
  statusCode: number;
  errors?: unknown[];

  constructor(statusCode: number, errors?: unknown[]) {
    super(`HTTP Error: ${statusCode}`);
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

export class NotFoundError extends HttpError {
  constructor() {
    super(404, [{ message: 'Not Found' }]);
  }
}
