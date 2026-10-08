export class AppError extends Error {
  public statusCode: number;
  public errors: any[];
  public isOperational: boolean;

  constructor(message: string, statusCode = 500, errors: any[] = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, errors: any[] = []) {
    return new AppError(message, 400, errors);
  }
  static unauthorized(message = 'Unauthorized') {
    return new AppError(message, 401);
  }
  static forbidden(message = 'Forbidden') {
    return new AppError(message, 403);
  }
  static notFound(message = 'Resource not found') {
    return new AppError(message, 404);
  }
  static conflict(message = 'Conflict', errors: any[] = []) {
    return new AppError(message, 409, errors);
  }
}
