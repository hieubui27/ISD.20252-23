import { IProductTypeConfig, FormFieldConfig } from './product-type.config';

export class BookFormConfig implements IProductTypeConfig {
  type = 'BOOK';
  label = 'Book';
  fields: FormFieldConfig[] = [
    { name: 'authors', label: 'Authors (comma-separated)', type: 'text' },
    { name: 'coverType', label: 'Cover Type', type: 'text' },
    { name: 'publisher', label: 'Publisher', type: 'text' },
    { name: 'publicationDate', label: 'Publication Date', type: 'date' },
    { name: 'numberOfPages', label: 'Number of Pages', type: 'number' },
    { name: 'language', label: 'Language', type: 'text' },
    { name: 'genre', label: 'Genre', type: 'text' },
  ];

  mapToForm(specificInfo: any): any {
    if (!specificInfo) return {};
    return {
      authors: specificInfo.authors ? specificInfo.authors.join(', ') : '',
      coverType: specificInfo.coverType || '',
      publisher: specificInfo.publisher || '',
      publicationDate: specificInfo.publicationDate || '',
      numberOfPages: specificInfo.numberOfPages || 0,
      language: specificInfo.language || '',
      genre: specificInfo.genre || '',
    };
  }

  mapToApi(formData: any): any {
    const payload: any = { ...formData };
    if (payload.authors) {
      payload.authors = payload.authors
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean);
    }
    payload.nbPages = Number(payload.numberOfPages) || 0;
    delete payload.numberOfPages;
    if (payload.publicationDate) {
      payload.publishDate = payload.publicationDate;
    }
    delete payload.publicationDate;
    return payload;
  }
}
