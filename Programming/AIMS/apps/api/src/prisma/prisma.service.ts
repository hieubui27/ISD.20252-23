import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from './generated/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService implements OnModuleInit {
  [key: string]: any;

  private readonly client: any;

  constructor() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    const { PrismaClient } = require('./generated/client');
    this.client = new PrismaClient({ adapter });

    return new Proxy(this, {
      get: (target, property, receiver) => {
        if (property in target) {
          return Reflect.get(target, property, receiver);
        }

        const value = target.client[property as keyof typeof target.client];
        return typeof value === 'function' ? value.bind(target.client) : value;
      },
    });
  }

  async onModuleInit() {
    await this.client.$connect();
  }
}
