export class HttpError extends Error {
  statusCode: number;
  errors?: unknown[];

  constructor(statusCode: number, errors?: unknown[]) {
    super(`HTTP Error: ${statusCode}`);
    this.statusCode = statusCode;
    this.errors = errors;
  }
}
