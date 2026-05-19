import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  CartQuantityValidator,
  ProductAvailabilityService,
  ProductDetailAccessChecker,
  ProductDetailMapper,
  ProductDetailService,
  ProductDetailValidator,
} from '../../../../api/src/product/product-detail/product-detail.service';

describe('ProductDetailService', () => {
  const bookProduct = {
    id: 'BK10293847',
    name: 'Doraemon Volume 1',
    type: 'Book',
    currentPrice: 85000,
    originalValue: 70000,
    barcode: 'BK10293847',
    description: "A popular children's comic book",
    weight: 350,
    dimensions: { height: 20, width: 14, length: 2 },
    status: 'ACTIVE',
    stock: 12,
    author: 'Fujiko F. Fujio',
    coverType: 'Paperback',
    publisher: 'Kim Dong',
    publicationDate: '2024-01-15',
    numberOfPages: 192,
    language: 'Vietnamese',
    genre: 'Comic',
  };

  describe('US012 - Product Detail Validation and Retrieval Suite', () => {
    let mockProductRepository: { findProductById: jest.Mock };
    let mockMediaRepository: { findMediaByProductId: jest.Mock };
    let service: ProductDetailService;

    beforeEach(() => {
      mockProductRepository = {
        findProductById: jest.fn(),
      };
      mockMediaRepository = {
        findMediaByProductId: jest.fn(),
      };
      service = new ProductDetailService(
        mockProductRepository,
        mockMediaRepository,
      );
      jest.clearAllMocks();
    });

    // UT_VPD_001
    it('should accept valid product identifier (UT_VPD_001)', () => {
      expect(ProductDetailValidator.validateProductId('BK10293847')).toBe(true);
    });

    // UT_VPD_002
    it('should reject missing product identifier (UT_VPD_002)', async () => {
      expect(ProductDetailValidator.validateProductId(null)).toBe(false);
      expect(ProductDetailValidator.validateProductId('')).toBe(false);
      expect(ProductDetailValidator.validateProductId('   ')).toBe(false);

      await expect(
        service.getProductDetail(null as any, { role: 'Customer' }),
      ).rejects.toThrow(BadRequestException);
      expect(mockProductRepository.findProductById).not.toHaveBeenCalled();
    });

    // UT_VPD_003
    it('should reject invalid product identifier format (UT_VPD_003)', async () => {
      expect(ProductDetailValidator.validateProductId('../bad-id')).toBe(false);
      expect(ProductDetailValidator.validateProductId('<script>')).toBe(false);
      expect(ProductDetailValidator.validateProductId('###')).toBe(false);

      await expect(
        service.getProductDetail('../bad-id', { role: 'Customer' }),
      ).rejects.toThrow(BadRequestException);
      expect(mockProductRepository.findProductById).not.toHaveBeenCalled();
    });

    // UT_VPD_004
    it('should retrieve selected product successfully (UT_VPD_004)', async () => {
      mockProductRepository.findProductById.mockResolvedValue(bookProduct);
      mockMediaRepository.findMediaByProductId.mockResolvedValue([
        { url: '/images/bk10293847.jpg', type: 'IMAGE' },
      ]);

      const result = await service.getProductDetail('BK10293847', {
        role: 'Customer',
      });

      expect(mockProductRepository.findProductById).toHaveBeenCalledWith(
        'BK10293847',
      );
      expect(result).toEqual(
        expect.objectContaining({
          id: 'BK10293847',
          name: 'Doraemon Volume 1',
          type: 'Book',
          status: 'ACTIVE',
          currentPrice: 85000,
        }),
      );
      expect(result.media).toEqual([
        { url: '/images/bk10293847.jpg', type: 'IMAGE' },
      ]);
    });

    // UT_VPD_005
    it('should handle product not found (UT_VPD_005)', async () => {
      mockProductRepository.findProductById.mockResolvedValue(null);

      await expect(
        service.getProductDetail('UNKNOWN_001', { role: 'Customer' }),
      ).rejects.toThrow(NotFoundException);
      expect(mockMediaRepository.findMediaByProductId).not.toHaveBeenCalled();
    });
  });

  describe('US013 - Product Detail Access and Availability Suite', () => {
    // UT_VPD_006
    it('should allow Customer to view public product detail (UT_VPD_006)', () => {
      expect(
        ProductDetailAccessChecker.canViewProductDetail(
          { role: 'Customer' },
          { status: 'ACTIVE' },
        ),
      ).toBe(true);
    });

    // UT_VPD_007
    it('should allow authenticated Product Manager to view product detail (UT_VPD_007)', () => {
      expect(
        ProductDetailAccessChecker.canViewProductDetail(
          { role: 'ProductManager', isAuthenticated: true },
          { status: 'DEACTIVATED' },
        ),
      ).toBe(true);
    });

    // UT_VPD_008
    it('should reject unauthenticated Product Manager (UT_VPD_008)', () => {
      expect(
        ProductDetailAccessChecker.canViewProductDetail(
          { role: 'ProductManager', isAuthenticated: false },
          { status: 'ACTIVE' },
        ),
      ).toBe(false);
    });

    // UT_VPD_009
    it('should mark active product with positive stock as available (UT_VPD_009)', () => {
      expect(
        ProductAvailabilityService.getAvailabilityStatus(
          { status: 'ACTIVE', stock: 12 },
          { role: 'Customer' },
        ),
      ).toEqual({
        status: 'Available',
        canAddToCart: true,
        currentStatus: 'ACTIVE',
      });
    });

    // UT_VPD_010
    it('should mark unavailable or deactivated product as not addable to cart (UT_VPD_010)', () => {
      expect(
        ProductAvailabilityService.getAvailabilityStatus(
          { status: 'DEACTIVATED', stock: 5 },
          { role: 'Customer' },
        ),
      ).toEqual({
        status: 'Deactivated',
        canAddToCart: false,
        currentStatus: 'DEACTIVATED',
      });
    });
  });

  describe('US014 - Product Detail Display and Cart Action Suite', () => {
    // UT_VPD_011
    it('should map general product detail fields correctly (UT_VPD_011)', () => {
      expect(ProductDetailMapper.mapGeneralProductDetail(bookProduct)).toEqual({
        id: 'BK10293847',
        name: 'Doraemon Volume 1',
        type: 'Book',
        currentPrice: 85000,
        originalValue: 70000,
        barcode: 'BK10293847',
        description: "A popular children's comic book",
        weight: 350,
        dimensions: { height: 20, width: 14, length: 2 },
        status: 'ACTIVE',
      });
    });

    // UT_VPD_012
    it('should map Book-specific fields correctly (UT_VPD_012)', () => {
      expect(ProductDetailMapper.mapBookDetail(bookProduct)).toEqual(
        expect.objectContaining({
          author: 'Fujiko F. Fujio',
          coverType: 'Paperback',
          publisher: 'Kim Dong',
          publicationDate: '2024-01-15',
          numberOfPages: 192,
          language: 'Vietnamese',
          genre: 'Comic',
        }),
      );
    });

    // UT_VPD_013
    it('should map Newspaper-specific fields correctly (UT_VPD_013)', () => {
      const newspaperProduct = {
        id: 'NP10293847',
        name: 'Daily News',
        type: 'Newspaper',
        editorInChief: 'Tran Minh',
        publisher: 'AIMS Press',
        publicationDate: '2024-02-01',
        issueNumber: '45',
        publicationFrequency: 'Daily',
        ISSN: '1234-5678',
        language: 'Vietnamese',
        sections: ['Business', 'Culture'],
      };

      expect(ProductDetailMapper.mapNewspaperDetail(newspaperProduct)).toEqual(
        expect.objectContaining({
          editorInChief: 'Tran Minh',
          publisher: 'AIMS Press',
          publicationDate: '2024-02-01',
          issueNumber: '45',
          publicationFrequency: 'Daily',
          ISSN: '1234-5678',
          language: 'Vietnamese',
          sections: ['Business', 'Culture'],
        }),
      );
    });

    // UT_VPD_014
    it('should map CD-specific fields correctly (UT_VPD_014)', () => {
      const cdProduct = {
        id: 'CD10293847',
        name: 'Greatest Hits',
        type: 'CD',
        artists: ['Artist A', 'Artist B'],
        recordLabel: 'AIMS Records',
        tracks: [
          { title: 'Opening', length: '03:20' },
          { title: 'Ending', length: '04:10' },
        ],
        genre: 'Pop',
        releaseDate: '2024-03-01',
      };

      expect(ProductDetailMapper.mapCDDetail(cdProduct)).toEqual(
        expect.objectContaining({
          artists: ['Artist A', 'Artist B'],
          recordLabel: 'AIMS Records',
          tracks: [
            { title: 'Opening', length: '03:20' },
            { title: 'Ending', length: '04:10' },
          ],
          genre: 'Pop',
          releaseDate: '2024-03-01',
        }),
      );
    });

    // UT_VPD_015
    it('should map DVD-specific fields correctly (UT_VPD_015)', () => {
      const dvdProduct = {
        id: 'DVD10293847',
        name: 'Movie Collection',
        type: 'DVD',
        discType: 'Blu-ray',
        director: 'Christopher Nolan',
        runtime: 148,
        studio: 'AIMS Studio',
        language: 'English',
        subtitles: ['Vietnamese', 'English'],
        releaseDate: '2024-04-01',
        genre: 'Sci-Fi',
      };

      expect(ProductDetailMapper.mapDVDDetail(dvdProduct)).toEqual(
        expect.objectContaining({
          discType: 'Blu-ray',
          director: 'Christopher Nolan',
          runtime: 148,
          studio: 'AIMS Studio',
          language: 'English',
          subtitles: ['Vietnamese', 'English'],
          releaseDate: '2024-04-01',
          genre: 'Sci-Fi',
        }),
      );
    });

    // UT_VPD_016
    it('should accept valid quantity from product detail screen (UT_VPD_016)', () => {
      const mockCartService = {
        add: jest.fn(),
      };

      const isValid = CartQuantityValidator.validateAddToCartQuantity(
        2,
        12,
        'ACTIVE',
      );
      if (isValid) {
        mockCartService.add('BK10293847', 2);
      }

      expect(isValid).toBe(true);
      expect(mockCartService.add).toHaveBeenCalledWith('BK10293847', 2);
    });

    // UT_VPD_017
    it('should reject quantity greater than stock (UT_VPD_017)', () => {
      const mockCartService = {
        add: jest.fn(),
      };

      const isValid = CartQuantityValidator.validateAddToCartQuantity(
        20,
        12,
        'ACTIVE',
      );
      if (isValid) {
        mockCartService.add('BK10293847', 20);
      }

      expect(isValid).toBe(false);
      expect(mockCartService.add).not.toHaveBeenCalled();
    });
  });
});
