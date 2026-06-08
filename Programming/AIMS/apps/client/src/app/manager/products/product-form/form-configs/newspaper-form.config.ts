import { IProductTypeConfig, FormFieldConfig } from './product-type.config';

export class NewspaperFormConfig implements IProductTypeConfig {
  type = 'NEWSPAPER';
  label = 'Newspaper';
  fields: FormFieldConfig[] = [
    { name: 'editorInChief', label: 'Editor In Chief', type: 'text' },
    { name: 'publisher', label: 'Publisher', type: 'text' },
    { name: 'publicationDate', label: 'Publication Date', type: 'date' },
    { name: 'issueNumber', label: 'Issue Number', type: 'text' },
    { name: 'releaseFrequency', label: 'Release Frequency', type: 'text' },
    { name: 'issn', label: 'ISSN', type: 'text' },
    { name: 'language', label: 'Language', type: 'text' },
    { name: 'sections', label: 'Sections (comma-separated)', type: 'text' },
  ];

  mapToForm(specificInfo: any): any {
    if (!specificInfo) return {};
    return {
      editorInChief: specificInfo.editorInChief || '',
      publisher: specificInfo.publisher || '',
      publicationDate: specificInfo.publicationDate || '',
      issueNumber: specificInfo.issueNumber || '',
      releaseFrequency: specificInfo.releaseFrequency || '',
      issn: specificInfo.issn || '',
      language: specificInfo.language || '',
      sections: specificInfo.sections ? specificInfo.sections.join(', ') : '',
    };
  }

  mapToApi(formData: any): any {
    const payload: any = { ...formData };
    if (payload.sections) {
      payload.sections = payload.sections
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean);
    }
    payload.publicationFreq = payload.releaseFrequency;
    delete payload.releaseFrequency;
    if (payload.publicationDate) {
      payload.publishDate = payload.publicationDate;
    }
    delete payload.publicationDate;
    return payload;
  }
}
