import { CookieOptions } from 'express';

export class CookieConfig {
  static getOptions(maxAgeMs?: number): CookieOptions {
    const isProduction = process.env.NODE_ENV === 'production';
    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'strict',
      domain: isProduction ? '.aims.io.vn' : undefined,
      maxAge: maxAgeMs,
    };
  }
}
