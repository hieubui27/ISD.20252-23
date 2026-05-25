/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger, RequestMethod } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix, {
    exclude: [
      { path: 'bank/api/transaction-sync', method: RequestMethod.POST },
      { path: 'vqr/api/token_generate', method: RequestMethod.POST },
    ],
  });
  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
}

bootstrap();
