import { Injectable } from '@nestjs/common';

/**
 * Coupling: Data Coupling
 * Cohesion: Functional Cohesion
 *
 * Coupling reason:
 * - This config wrapper returns primitive environment values to VietQR services.
 * - It avoids sharing mutable configuration objects across modules.
 *
 * Cohesion reason:
 * - Its only responsibility is reading configuration values by key.
 */
@Injectable()
export class ConfigService {
  get(key: string): string | undefined {
    return process.env[key];
  }
}
