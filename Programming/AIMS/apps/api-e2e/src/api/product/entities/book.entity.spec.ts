import { BookEntity } from '../../../../../api/src/product/entities/book.entity';

describe('BookEntity', () => {
  describe('validate', () => {
    // UT_PM_016
    it('should validate book info (UT_PM_016)', () => {
      const validBook = new BookEntity({ author: 'Nguyen Nhat Anh' });
      expect(validBook.validate()).toBe(true);

      const invalidBook = new BookEntity({ author: null });
      expect(invalidBook.validate()).toBe(false);

      const emptyAuthorBook = new BookEntity({ author: '' });
      expect(emptyAuthorBook.validate()).toBe(false);
    });
  });
});
