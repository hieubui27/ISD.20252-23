import { IProductTypeConfig, FormFieldConfig } from './product-type.config';

export class DvdFormConfig implements IProductTypeConfig {
  type = 'DVD';
  label = 'DVD';
  fields: FormFieldConfig[] = [
    { name: 'discType', label: 'Disc Type', type: 'text' },
    { name: 'director', label: 'Director', type: 'text' },
    { name: 'runtime', label: 'Runtime (mins)', type: 'number' },
    { name: 'studio', label: 'Studio', type: 'text' },
    { name: 'language', label: 'Language', type: 'text' },
    { name: 'subtitles', label: 'Subtitles (comma-separated)', type: 'text' },
    { name: 'releaseDate', label: 'Release Date', type: 'date' },
    { name: 'genre', label: 'Genre', type: 'text' },
  ];

  mapToForm(specificInfo: any): any {
    if (!specificInfo) return {};
    return {
      discType: specificInfo.discType || '',
      director: specificInfo.director || '',
      runtime: specificInfo.runtime || 0,
      studio: specificInfo.studio || '',
      language: specificInfo.language || '',
      subtitles: specificInfo.subtitles
        ? specificInfo.subtitles.join(', ')
        : '',
      releaseDate: specificInfo.releaseDate || '',
      genre: specificInfo.genre || '',
    };
  }

  mapToApi(formData: any): any {
    const payload: any = { ...formData };
    if (payload.subtitles) {
      payload.subtitles = payload.subtitles
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean)
        .join(', ');
    }
    payload.totalLength = Number(payload.runtime) || 0;
    delete payload.runtime;
    if (!payload.releaseDate) {
      delete payload.releaseDate;
    }
    return payload;
  }
}
