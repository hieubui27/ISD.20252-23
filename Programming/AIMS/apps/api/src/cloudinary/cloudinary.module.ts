// apps/api/src/cloudinary/cloudinary.module.ts
import { Module } from '@nestjs/common';
import { CloudinaryProvider } from './cloudinary.provider';
import { CloudinaryService } from './cloudinary.service';

/**
 * Module: CloudinaryModule
 *
 * SOLID Review:
 * SRP: Satisfied. This module only wires Cloudinary provider and service.
 * OCP: Satisfied. The Cloudinary implementation can be swapped by changing the provider binding.
 * LSP: Not applicable. No inheritance hierarchy.
 * ISP: Satisfied. Exports only CloudinaryService for consumer modules.
 * DIP: Satisfied. Consumer modules depend on CloudinaryService, not on Cloudinary SDK details.
 *
 * + Coupling/Cohesion level: No Coupling / Functional Cohesion
 * + Reason why: No Coupling because this module serves as a declarative wiring container.
 *   Functional Cohesion because all elements are related to Cloudinary integration.
 */
@Module({
  providers: [CloudinaryProvider, CloudinaryService],
  exports: [CloudinaryService],
})
export class CloudinaryModule {}
