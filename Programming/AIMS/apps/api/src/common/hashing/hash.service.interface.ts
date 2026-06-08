export interface IHashService {
  hash(data: string | Buffer): Promise<string>;
  compare(data: string | Buffer, encrypted: string): Promise<boolean>;
}

export const IHashServiceToken = Symbol('IHashService');
