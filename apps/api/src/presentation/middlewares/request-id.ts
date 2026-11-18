import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const existingId = req.header('X-Request-Id');
  const requestId = existingId && existingId.trim().length > 0 ? existingId : uuidv4();
  
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-Id', requestId);
  res.locals.requestId = requestId;
  
  next();
}
