import { DVDEntity } from '../../../../../api/src/product/entities/dvd.entity';

describe('DVDEntity', () => {
  describe('validate', () => {
    // UT_PM_017
    it('should validate DVD info (UT_PM_017)', () => {
      const validDvd = new DVDEntity({ director: 'Christopher Nolan' });
      expect(validDvd.validate()).toBe(true);

      const invalidDvd = new DVDEntity({ director: null });
      expect(invalidDvd.validate()).toBe(false);

      const emptyDirectorDvd = new DVDEntity({ director: '' });
      expect(emptyDirectorDvd.validate()).toBe(false);
    });
  });
});
