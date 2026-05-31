import { Test, TestingModule } from '@nestjs/testing';
import { ProductController } from '../../src/product/product.controller';
import { ProductService } from '../../src/product/product.service';
import { BadRequestException, HttpException } from '@nestjs/common';
import { GetProductsListUseCase } from '../../src/product/application/use-cases/get-products-list.use-case';
import { GetProductDetailUseCase } from '../../src/product/application/use-cases/get-product-detail.use-case';

describe('ProductController', () => {
  let controller: ProductController;
  let service: ProductService;

  const mockProductService = {
    deleteProduct: jest.fn(),
    deleteBulk: jest.fn(),
  };

  const mockGetProductsListUseCase = {
    execute: jest.fn(),
  };

  const mockGetProductDetailUseCase = {
    execute: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductController],
      providers: [
        {
          provide: ProductService,
          useValue: mockProductService,
        },
        {
          provide: GetProductsListUseCase,
          useValue: mockGetProductsListUseCase,
        },
        {
          provide: GetProductDetailUseCase,
          useValue: mockGetProductDetailUseCase,
        },
      ],
    }).compile();

    controller = module.get<ProductController>(ProductController);
    service = module.get<ProductService>(ProductService);
    jest.clearAllMocks();
  });

  describe('delete (UT_PM_008 to UT_PM_011)', () => {
    // UT_PM_008
    it('should completely delete product when stock is 0 (UT_PM_008)', async () => {
      mockProductService.deleteProduct.mockResolvedValue({ status: 'DELETED' });

      const result = await controller.deleteProduct('1');

      expect(service.deleteProduct).toHaveBeenCalledWith('1');
      expect(result).toEqual({ status: 'DELETED' });
    });

    // UT_PM_009
    it('should deactivate product when stock > 0 (UT_PM_009)', async () => {
      mockProductService.deleteProduct.mockResolvedValue({
        status: 'DEACTIVATED',
      });

      const result = await controller.deleteProduct('2');

      expect(service.deleteProduct).toHaveBeenCalledWith('2');
      expect(result).toEqual({ status: 'DEACTIVATED' });
    });

    // UT_PM_010
    it('should throw exception when bulk delete exceeds limit (UT_PM_010)', async () => {
      const ids = Array.from({ length: 11 }, (_, i) => String(i));
      mockProductService.deleteBulk.mockRejectedValue(
        new BadRequestException('Chỉ được xóa tối đa 10 sản phẩm 1 lần'),
      );

      await expect(controller.deleteBulk(ids)).rejects.toThrow(
        BadRequestException,
      );
      expect(service.deleteBulk).toHaveBeenCalledWith(ids);
    });

    // UT_PM_011
    it('should throw exception when daily delete quota is exceeded (UT_PM_011)', async () => {
      mockProductService.deleteProduct.mockRejectedValue(
        new HttpException('Vượt quá hạn mức xóa sản phẩm trong ngày (20)', 429),
      );

      await expect(controller.deleteProduct('21')).rejects.toThrow(
        HttpException,
      );
      expect(service.deleteProduct).toHaveBeenCalledWith('21');
    });
  });

  describe('UC235 query endpoints', () => {
    it('should delegate product list loading to GetProductsListUseCase', async () => {
      const products = [
        {
          id: '1',
          title: 'Clean Architecture',
          type: 'BOOK',
          currentPrice: 120000,
          status: 'ACTIVE',
        },
      ];
      mockGetProductsListUseCase.execute.mockResolvedValue(products);

      await expect(controller.findAll()).resolves.toEqual(products);
      expect(mockGetProductsListUseCase.execute).toHaveBeenCalledWith();
    });

    it('should delegate product detail loading to GetProductDetailUseCase', async () => {
      const product = {
        id: '1',
        title: 'Clean Architecture',
        type: 'BOOK',
      };
      mockGetProductDetailUseCase.execute.mockResolvedValue(product);

      await expect(controller.findOne('1')).resolves.toEqual(product);
      expect(mockGetProductDetailUseCase.execute).toHaveBeenCalledWith('1');
    });
  });
});
