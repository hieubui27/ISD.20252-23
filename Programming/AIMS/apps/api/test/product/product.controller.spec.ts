import { Test, TestingModule } from '@nestjs/testing';
import { ProductController } from '../../src/product/product.controller';
import { ProductService } from '../../src/product/product.service';
import { BadRequestException, HttpException } from '@nestjs/common';

describe('ProductController', () => {
  let controller: ProductController;
  let service: ProductService;

  const mockProductService = {
    findOne: jest.fn(),
    remove: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductController],
      providers: [
        {
          provide: ProductService,
          useValue: mockProductService,
        },
      ],
    }).compile();

    controller = module.get<ProductController>(ProductController);
    service = module.get<ProductService>(ProductService);
    // Reset the internal daily quota counter for each test
    controller.resetDailyQuota();
    jest.clearAllMocks();
  });

  describe('delete (UT_PM_008 to UT_PM_011)', () => {
    // UT_PM_008
    it('should completely delete product when stock is 0 (UT_PM_008)', async () => {
      mockProductService.findOne.mockResolvedValue({ id: '1', quantity: 0 });
      const result = await controller.deleteProduct('1');
      expect(service.remove).toHaveBeenCalledWith('1');
      expect(result).toEqual({ status: 'DELETED' });
    });

    // UT_PM_009
    it('should deactivate product when stock > 0 (UT_PM_009)', async () => {
      mockProductService.findOne.mockResolvedValue({ id: '2', quantity: 10 });
      const result = await controller.deleteProduct('2');
      expect(service.update).toHaveBeenCalledWith(
        '2',
        expect.objectContaining({ status: 'DEACTIVATED' }),
      );
      expect(result).toEqual({ status: 'DEACTIVATED' });
    });

    // UT_PM_010
    it('should throw exception when bulk delete exceeds limit (UT_PM_010)', async () => {
      const ids = Array.from({ length: 11 }, (_, i) => String(i));
      await expect(controller.deleteBulk(ids)).rejects.toThrow(
        BadRequestException,
      );
    });

    // UT_PM_011
    it('should throw exception when daily delete quota is exceeded (UT_PM_011)', async () => {
      // Mock finding a product with stock 0 so it actually deletes
      mockProductService.findOne.mockResolvedValue({ id: '1', quantity: 0 });

      // Run 20 deletes successfully
      for (let i = 0; i < 20; i++) {
        await controller.deleteProduct(String(i));
      }

      // The 21st delete should fail
      await expect(controller.deleteProduct('21')).rejects.toThrow(
        HttpException,
      );
    });
  });
});
