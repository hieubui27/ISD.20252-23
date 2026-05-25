// apps/api/src/product/product.module.ts
import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProductController],
  providers: [ProductService],
})
/**
 * + Coupling/Cohesion level: Data Coupling / Functional Cohesion
 * + Reason why: Data Coupling because it simply imports the PrismaModule and injects providers/controllers without depending on their internal implementations. Functional Cohesion because it encapsulates all the dependencies related to the Product feature domain.
 */
export class ProductModule {}
