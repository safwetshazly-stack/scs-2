import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Distributed Tracing Middleware
 * Injects a correlation ID into every request for end-to-end tracing across services and Kafka
 */
export const tracingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Extract existing correlation ID (e.g., from NGINX Gateway) or generate a new one
  const correlationId = (req.headers['x-correlation-id'] as string) || randomUUID();
  
  // Attach to request object for downstream services to access
  (req as any).correlationId = correlationId;

  // Add back to response headers
  res.setHeader('X-Correlation-ID', correlationId);

  next();
};
