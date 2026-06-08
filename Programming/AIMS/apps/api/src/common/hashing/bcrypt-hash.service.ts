import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { IHashService } from './hash.service.interface';

@Injectable()
export class BcryptHashService implements IHashService {
  private readonly saltRounds = 10;

  async hash(data: string | Buffer): Promise<string> {
    return bcrypt.hash(data, this.saltRounds);
  }

  async compare(data: string | Buffer, encrypted: string): Promise<boolean> {
    return bcrypt.compare(data, encrypted);
  }
}
