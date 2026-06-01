import { IProductTypeConfig, FormFieldConfig } from './product-type.config';

export class CdFormConfig implements IProductTypeConfig {
  type = 'CD';
  label = 'CD';
  fields: FormFieldConfig[] = [
    { name: 'artists', label: 'Artists (comma-separated)', type: 'text' },
    { name: 'recordLabel', label: 'Record Label', type: 'text' },
    { name: 'trackList', label: 'Track List (comma-separated)', type: 'text' },
    { name: 'genre', label: 'Genre', type: 'text' },
    { name: 'releaseDate', label: 'Release Date', type: 'date' },
  ];

  mapToForm(specificInfo: any): any {
    if (!specificInfo) return {};
    return {
      artists: specificInfo.artists ? specificInfo.artists.join(', ') : '',
      recordLabel: specificInfo.recordLabel || '',
      trackList: specificInfo.trackList
        ? specificInfo.trackList.join(', ')
        : '',
      genre: specificInfo.genre || '',
      releaseDate: specificInfo.releaseDate || '',
    };
  }

  mapToApi(formData: any): any {
    const payload: any = { ...formData };
    if (payload.artists) {
      payload.artist = payload.artists
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean)
        .join(', ');
      delete payload.artists;
    }
    if (payload.trackList) {
      payload.track = payload.trackList
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean)
        .join(', ');
      delete payload.trackList;
    }
    if (!payload.releaseDate) {
      delete payload.releaseDate;
    }
    return payload;
  }
}
