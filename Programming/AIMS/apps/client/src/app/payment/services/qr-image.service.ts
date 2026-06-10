import { Injectable } from '@angular/core';
import * as QRCode from 'qrcode';

@Injectable({ providedIn: 'root' })
export class QrImageService {
  toDataUrl(source: string): Promise<string> {
    return QRCode.toDataURL(source, {
      width: 220,
      margin: 1,
    });
  }
}
