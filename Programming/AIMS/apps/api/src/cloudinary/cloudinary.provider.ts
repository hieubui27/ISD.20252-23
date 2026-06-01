// apps/api/src/cloudinary/cloudinary.provider.ts
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

/**
 * Provider: CLOUDINARY
 *
 * SOLID Review:
 * SRP: Satisfied. This provider's sole responsibility is configuring the Cloudinary SDK instance.
 * OCP: Satisfied. Cloudinary config values can be changed via environment variables without modifying code.
 * LSP: Not applicable. No inheritance hierarchy.
 * ISP: Satisfied. Exposes only the configured cloudinary instance.
 * DIP: Satisfied. Depends on ConfigService abstraction for configuration values, not on hardcoded strings.
 *
 * + Coupling/Cohesion level: Data Coupling / Functional Cohesion
 * + Reason why: Data Coupling because it only depends on ConfigService to read environment variables.
 *   Functional Cohesion because all logic is focused on a single task: configuring the Cloudinary SDK.
 */
export const CLOUDINARY = 'CLOUDINARY';

export const CloudinaryProvider = {
  provide: CLOUDINARY,
  useFactory: (configService: ConfigService) => {
    return cloudinary.config({
      cloud_name: configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  },
  inject: [ConfigService],
};
