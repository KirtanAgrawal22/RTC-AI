import rateLimit from 'express-rate-limit';

export const executionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many execution requests from this IP. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});