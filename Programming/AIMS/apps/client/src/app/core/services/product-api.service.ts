import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AIMS_API_BASE_URL } from '../api/api.config';
import {
  BookSpecificInfo,
  CDSpecificInfo,
  DVDSpecificInfo,
  NewspaperSpecificInfo,
  ProductDetail,
  ProductDimensions,
  ProductListItem,
  ProductSpecificInfo,
  ProductType,
} from '../../features/products/models/product.model';

type ProductListResponse =
  | unknown[]
  | {
      data?: unknown[];
      items?: unknown[];
      products?: unknown[];
      content?: unknown[];
    };

type ProductRecord = Record<string, unknown>;

/**
 * Module: ProductApiService
 * Use Case: UC235 - View Product Detail
 *
 * SOLID Review:
 * SRP: Satisfied. This service centralizes HTTP access for product read APIs.
 * OCP: Satisfied. Components can stay unchanged if endpoint internals evolve behind this service.
 * LSP: Not applicable. This service does not define an inheritance hierarchy.
 * ISP: Satisfied. It exposes only read methods needed by list and detail screens.
 * DIP: Partially satisfied. Components depend on this Angular service instead of hardcoded HttpClient calls.
 *
 * Improvement Direction:
 * Keep all product read endpoint calls here and do not duplicate API URLs inside components.
 */
@Injectable({ providedIn: 'root' })
export class ProductApiService {
  private readonly apiUrl = `${AIMS_API_BASE_URL}/products`;
  private readonly http = inject(HttpClient);

  getProducts(): Observable<ProductListItem[]> {
    return this.http
      .get<ProductListResponse>(this.apiUrl)
      .pipe(map((response) => this.unwrapProducts(response)));
  }

  getProductDetail(productId: string): Observable<ProductDetail> {
    return this.http
      .get<unknown>(`${this.apiUrl}/${productId}`)
      .pipe(map((response) => this.normalizeProductDetail(response)));
  }

  private unwrapProducts(response: ProductListResponse): ProductListItem[] {
    const products = Array.isArray(response)
      ? response
      : response.data ?? response.products ?? response.items ?? response.content ?? [];

    return products.map((product) => {
      const rawProduct = this.toRecord(product);
      const stockQuantity = this.toNumber(
        rawProduct['stockQuantity'] ?? rawProduct['quantity'],
      );

      return {
        id: this.toString(rawProduct['id']),
        title: this.toString(rawProduct['title'] ?? rawProduct['name']),
        type: this.normalizeProductType(rawProduct['type'] ?? rawProduct['category']),
        currentPrice: this.toNumber(rawProduct['currentPrice']),
        imageUrl: this.normalizeImageUrl(rawProduct['imageUrl']),
        status: this.normalizeStatus(rawProduct['status'], stockQuantity),
      };
    });
  }

  private normalizeProductDetail(rawResponse: unknown): ProductDetail {
    const product = this.toRecord(rawResponse);
    const stockQuantity = this.toNumber(
      product['stockQuantity'] ?? product['quantity'],
    );
    const type = this.normalizeProductType(product['type'] ?? product['category']);

    return {
      id: this.toString(product['id']),
      barcode: this.toString(product['barcode']),
      title: this.toString(product['title'] ?? product['name']),
      type,
      currentPrice: this.toNumber(product['currentPrice']),
      originalValue: this.toNumber(product['originalValue']),
      description: this.toString(
        product['description'] ?? product['generalDescription'],
      ),
      weight: this.toNumber(product['weight']),
      dimensions: this.normalizeDimensions(product['dimensions']),
      imageUrl: this.normalizeImageUrl(product['imageUrl']),
      stockQuantity,
      status: this.normalizeStatus(product['status'], stockQuantity),
      specificInfo: this.normalizeSpecificInfo(type, product),
    };
  }

  private normalizeSpecificInfo(
    type: ProductType,
    product: ProductRecord,
  ): ProductSpecificInfo {
    const specificInfo = this.toRecord(product['specificInfo']);

    if (Object.keys(specificInfo).length > 0) {
      return specificInfo as ProductSpecificInfo;
    }

    if (type === 'BOOK') {
      return this.normalizeBookInfo(product);
    }

    if (type === 'NEWSPAPER') {
      return this.normalizeNewspaperInfo(product);
    }

    if (type === 'CD') {
      return this.normalizeCdInfo(product);
    }

    if (type === 'DVD') {
      return this.normalizeDvdInfo(product);
    }

    return {};
  }

  private normalizeBookInfo(product: ProductRecord): BookSpecificInfo {
    const printableProduct = this.toRecord(product['printableProduct']);
    const book = this.toRecord(printableProduct['book']);

    return {
      authors: this.toStringList(book['authors'] ?? book['author']),
      coverType: this.toString(book['coverType']),
      publisher: this.toString(printableProduct['publisher']),
      publicationDate: this.toDateText(
        printableProduct['publicationDate'] ?? printableProduct['publishDate'],
      ),
      numberOfPages: this.toNumber(book['numberOfPages'] ?? book['nbPages']),
      language: this.toString(printableProduct['language']),
      genre: this.toString(book['genre']),
    };
  }

  private normalizeNewspaperInfo(product: ProductRecord): NewspaperSpecificInfo {
    const printableProduct = this.toRecord(product['printableProduct']);
    const newspaper = this.toRecord(printableProduct['newspaper']);

    return {
      editorInChief: this.toString(
        newspaper['editorInChief'] ?? newspaper['editor_in_chief'],
      ),
      publisher: this.toString(printableProduct['publisher']),
      publicationDate: this.toDateText(
        printableProduct['publicationDate'] ?? printableProduct['publishDate'],
      ),
      issueNumber: this.toString(newspaper['issueNumber']),
      releaseFrequency: this.toString(
        newspaper['releaseFrequency'] ?? newspaper['frequency'],
      ),
      issn: this.toString(newspaper['issn'] ?? newspaper['ISSN']),
      language: this.toString(printableProduct['language']),
      sections: this.toStringList(newspaper['sections']),
    };
  }

  private normalizeCdInfo(product: ProductRecord): CDSpecificInfo {
    const discProduct = this.toRecord(product['discProduct']);
    const cd = this.toRecord(discProduct['cd']);

    return {
      artists: this.toStringList(cd['artists'] ?? cd['artist']),
      recordLabel: this.toString(cd['recordLabel']),
      trackList: this.toStringList(cd['trackList'] ?? cd['track']),
      genre: this.toString(discProduct['genre']),
      releaseDate: this.toDateText(discProduct['releaseDate']),
    };
  }

  private normalizeDvdInfo(product: ProductRecord): DVDSpecificInfo {
    const discProduct = this.toRecord(product['discProduct']);
    const dvd = this.toRecord(discProduct['dvd']);

    return {
      discType: this.toString(dvd['discType'] ?? dvd['format']),
      director: this.toString(dvd['director']),
      runtime: this.toNumber(dvd['runtime'] ?? discProduct['totalLength']),
      studio: this.toString(dvd['studio']),
      language: this.toString(discProduct['language'] ?? dvd['language']),
      subtitles: this.toStringList(dvd['subtitles']),
      releaseDate: this.toDateText(discProduct['releaseDate']),
      genre: this.toString(discProduct['genre']),
    };
  }

  private normalizeProductType(value: unknown): ProductType {
    const normalized = this.toString(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toUpperCase();

    if (normalized.includes('NEWSPAPER') || normalized.includes('BAO')) {
      return 'NEWSPAPER';
    }

    if (normalized.includes('DVD')) {
      return 'DVD';
    }

    if (normalized.includes('CD') || normalized.includes('VINYL')) {
      return 'CD';
    }

    return 'BOOK';
  }

  private normalizeStatus(value: unknown, stockQuantity: number): string {
    const status = this.toString(value).toUpperCase() || 'UNKNOWN';

    if (stockQuantity <= 0 && status === 'ACTIVE') {
      return 'OUT_OF_STOCK';
    }

    return status;
  }

  private normalizeDimensions(value: unknown): ProductDimensions {
    if (value && typeof value === 'object') {
      const dimensions = this.toRecord(value);

      return {
        height: this.toNumber(dimensions['height']),
        width: this.toNumber(dimensions['width']),
        length: this.toNumber(dimensions['length']),
      };
    }

    const parts = this.toString(value)
      .split(/[xX*]/)
      .map((part) => this.toNumber(part.trim()));

    return {
      height: parts[0] ?? 0,
      width: parts[1] ?? 0,
      length: parts[2] ?? 0,
    };
  }

  private normalizeImageUrl(value: unknown): string | undefined {
    const imageUrl = this.toString(value).trim();

    if (!imageUrl || imageUrl.toUpperCase() === 'N/A') {
      return undefined;
    }

    return imageUrl;
  }

  private toRecord(value: unknown): ProductRecord {
    return value && typeof value === 'object'
      ? (value as ProductRecord)
      : {};
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value ?? 0);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  private toString(value: unknown): string {
    return value == null ? '' : String(value);
  }

  private toStringList(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.map((item) => this.toString(item)).filter(Boolean);
    }

    return this.toString(value)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private toDateText(value: unknown): string {
    const rawValue = this.toString(value);

    if (!rawValue) {
      return '';
    }

    const date = new Date(rawValue);

    if (Number.isNaN(date.getTime())) {
      return rawValue;
    }

    return date.toISOString().slice(0, 10);
  }
}
