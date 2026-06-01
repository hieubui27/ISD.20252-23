// apps/api/src/cloudinary/cloudinary.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiErrorResponse,
} from 'cloudinary';
import { Readable } from 'stream';

/**
 * Minimal interface for an uploaded file buffer.
 * Avoids coupling to Express.Multer.File / @types/multer.
 */
export interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

/**
 * Service: CloudinaryService
 *
 * SOLID Review:
 * SRP: Satisfied. This service's sole responsibility is uploading files to Cloudinary.
 * OCP: Satisfied. New upload configurations (e.g., different folders, transformations)
 *   can be added as new methods without modifying the existing uploadImage method.
 * LSP: Not applicable. This class does not define an inheritance hierarchy.
 * ISP: Satisfied. Exposes only the uploadImage method needed by consumers.
 * DIP: Satisfied. Depends on the Cloudinary SDK configured via the CloudinaryProvider,
 *   not on direct environment variable access.
 *
 * + Coupling/Cohesion level: Data Coupling / Functional Cohesion
 * + Reason why: Data Coupling because it only receives a file buffer (simple data) as input.
 *   Functional Cohesion because all logic is focused on a single task: uploading a file to Cloudinary.
 */
@Injectable()
export class CloudinaryService {
  /**
   * Uploads a file buffer to Cloudinary and returns the upload response.
   *
   * @param file - Multer file object containing the buffer, mimetype, and originalname.
   * @returns Promise resolving to Cloudinary's UploadApiResponse with secure_url.
   * @throws BadRequestException if the upload fails.
   */
  async uploadImage(file: UploadedFile): Promise<UploadApiResponse> {
    return new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'aims-products',
          resource_type: 'image',
        },
        (
          error: UploadApiErrorResponse | undefined,
          result: UploadApiResponse | undefined,
        ) => {
          if (error || !result) {
            reject(
              new BadRequestException(
                error?.message || 'Lỗi khi tải ảnh lên Cloudinary',
              ),
            );
            return;
          }
          resolve(result);
        },
      );

      const readableStream = new Readable();
      readableStream.push(file.buffer);
      readableStream.push(null);
      readableStream.pipe(uploadStream);
    });
  }
}
