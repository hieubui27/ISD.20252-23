/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { PrismaService } from './prisma/prisma.service';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
const cookieParser = require('cookie-parser');
const express = require('express');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Increase body parser limits for large payloads
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // Enable CORS for frontend
  app.enableCors({
    origin: ['http://localhost:4200'],
    credentials: true,
  });

  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableCors({ origin: 'http://localhost:4200', credentials: true });

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  const port = process.env.PORT || 3000;

  // Sync postgres sequences
  const prismaService = app.get(PrismaService);
  const tables = [
    'product',
    'orders',
    'invoice',
    'transaction',
    'authors',
    'roles',
    'users',
    'product_log',
  ];
  for (const table of tables) {
    try {
      await prismaService.$executeRawUnsafe(
        `SELECT setval('"${table}_id_seq"', COALESCE((SELECT MAX(id) + 1 FROM "${table}"), 1), false);`,
      );
    } catch (e: any) {
      Logger.error(`Error fixing sequence for ${table}: ` + e.message);
    }
  }

  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
}

bootstrap();
