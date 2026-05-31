import 'dotenv/config';
import { Pool, PoolClient } from 'pg';

type BaseProductSeed = {
  barcode: string;
  category: 'BOOK' | 'NEWSPAPER' | 'CD' | 'DVD';
  title: string;
  description: string;
  dimensions: string;
  weight: number;
  originalValue: number;
  currentPrice: number;
  quantity: number;
  status: string;
  imageUrl: string;
  videoUrl: string;
};

type BookSeed = BaseProductSeed & {
  category: 'BOOK';
  publisher: string;
  language: string;
  publishDate: string;
  coverType: string;
  nbPages: number;
  genre: string;
  authors: string[];
};

type NewspaperSeed = BaseProductSeed & {
  category: 'NEWSPAPER';
  publisher: string;
  language: string;
  publishDate: string;
  editorInChief: string;
  issueNumber: string;
  publicationFreq: string;
  issn: string;
  sections: string;
};

type CdSeed = BaseProductSeed & {
  category: 'CD';
  releaseDate: string;
  genre: string;
  language: string;
  totalLength: number;
  artist: string;
  recordLabel: string;
  track: string;
};

type DvdSeed = BaseProductSeed & {
  category: 'DVD';
  releaseDate: string;
  genre: string;
  language: string;
  totalLength: number;
  discType: string;
  director: string;
  studio: string;
  subtitles: string;
};

type ProductSeed = BookSeed | NewspaperSeed | CdSeed | DvdSeed;

const connectionString = process.env.DATABASE_URL ?? process.env.DIRECT_URL;

if (!connectionString) {
  throw new Error(
    'DATABASE_URL or DIRECT_URL must be set before seeding UC235 product data.',
  );
}

const pool = new Pool({ connectionString });

const demoProducts: ProductSeed[] = [
  {
    barcode: 'AIMS-UC235-BOOK-001',
    category: 'BOOK',
    title: 'Clean Architecture',
    description: 'A software design book used to demonstrate product detail.',
    dimensions: 'height=24;width=16;length=3',
    weight: 520,
    originalValue: 180000,
    currentPrice: 150000,
    quantity: 12,
    status: 'ACTIVE',
    imageUrl:
      'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=900&auto=format&fit=crop',
    videoUrl: 'https://example.com/aims/clean-architecture',
    publisher: 'Prentice Hall',
    language: 'English',
    publishDate: '2017-09-20',
    coverType: 'Paperback',
    nbPages: 432,
    genre: 'Software Engineering',
    authors: ['Robert C. Martin'],
  },
  {
    barcode: 'AIMS-UC235-NEWSPAPER-001',
    category: 'NEWSPAPER',
    title: 'AIMS Daily Technology',
    description: 'Daily newspaper issue for UC235 unavailable status demo.',
    dimensions: 'height=40;width=28;length=1',
    weight: 180,
    originalValue: 30000,
    currentPrice: 25000,
    quantity: 40,
    status: 'UNAVAILABLE',
    imageUrl:
      'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=900&auto=format&fit=crop',
    videoUrl: 'https://example.com/aims/daily-technology',
    publisher: 'AIMS Press',
    language: 'Vietnamese',
    publishDate: '2026-05-01',
    editorInChief: 'Tran Minh',
    issueNumber: '2026-05-01',
    publicationFreq: 'Daily',
    issn: '1234-5678',
    sections: 'Technology, Business, Culture',
  },
  {
    barcode: 'AIMS-UC235-CD-001',
    category: 'CD',
    title: 'Acoustic Evening',
    description: 'Music CD with zero stock for UC235 out-of-stock demo.',
    dimensions: 'height=12;width=12;length=1',
    weight: 95,
    originalValue: 120000,
    currentPrice: 99000,
    quantity: 0,
    status: 'ACTIVE',
    imageUrl:
      'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=900&auto=format&fit=crop',
    videoUrl: 'https://example.com/aims/acoustic-evening',
    releaseDate: '2024-03-15',
    genre: 'Acoustic',
    language: 'English',
    totalLength: 48,
    artist: 'AIMS Ensemble',
    recordLabel: 'AIMS Records',
    track: 'Opening Night, City Lights, Last Train',
  },
  {
    barcode: 'AIMS-UC235-DVD-001',
    category: 'DVD',
    title: 'Design Principles Workshop',
    description: 'Training DVD with deactivated status for UC235 notice demo.',
    dimensions: 'height=19;width=13;length=2',
    weight: 160,
    originalValue: 210000,
    currentPrice: 175000,
    quantity: 7,
    status: 'DEACTIVATED',
    imageUrl:
      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=900&auto=format&fit=crop',
    videoUrl: 'https://example.com/aims/design-principles-workshop',
    releaseDate: '2025-11-05',
    genre: 'Education',
    language: 'English',
    totalLength: 96,
    discType: 'DVD',
    director: 'Nguyen An',
    studio: 'AIMS Studio',
    subtitles: 'Vietnamese, English',
  },
];

async function seedProduct(
  client: PoolClient,
  seed: ProductSeed,
): Promise<void> {
  const existing = await client.query<{ id: string }>(
    'SELECT id FROM product WHERE barcode = $1',
    [seed.barcode],
  );

  if (existing.rowCount && existing.rowCount > 0) {
    console.log(`Skipped existing product: ${seed.barcode}`);
    return;
  }

  await client.query('BEGIN');

  try {
    const productResult = await client.query<{ id: string }>(
      `
        INSERT INTO product (
          barcode,
          category,
          title,
          description,
          dimensions,
          weight,
          original_value,
          current_price,
          quantity,
          status,
          image_url,
          video_url
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
      `,
      [
        seed.barcode,
        seed.category,
        seed.title,
        seed.description,
        seed.dimensions,
        seed.weight,
        seed.originalValue,
        seed.currentPrice,
        seed.quantity,
        seed.status,
        seed.imageUrl,
        seed.videoUrl,
      ],
    );

    const productId = productResult.rows[0].id;

    if (seed.category === 'BOOK') {
      await client.query(
        `
          INSERT INTO printable_product (id, publisher, language, publish_date)
          VALUES ($1, $2, $3, $4)
        `,
        [productId, seed.publisher, seed.language, seed.publishDate],
      );

      await client.query(
        `
          INSERT INTO book (id, cover_type, nb_pages, genre)
          VALUES ($1, $2, $3, $4)
        `,
        [productId, seed.coverType, seed.nbPages, seed.genre],
      );

      for (const authorName of seed.authors) {
        const authorResult = await client.query<{ id: string }>(
          'INSERT INTO authors (name) VALUES ($1) RETURNING id',
          [authorName],
        );

        await client.query(
          `
            INSERT INTO book_author (book_id, author_id)
            VALUES ($1, $2)
          `,
          [productId, authorResult.rows[0].id],
        );
      }
    }

    if (seed.category === 'NEWSPAPER') {
      await client.query(
        `
          INSERT INTO printable_product (id, publisher, language, publish_date)
          VALUES ($1, $2, $3, $4)
        `,
        [productId, seed.publisher, seed.language, seed.publishDate],
      );

      await client.query(
        `
          INSERT INTO newspaper (
            id,
            editor_in_chief,
            issue_number,
            publication_freq,
            issn,
            sections
          )
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          productId,
          seed.editorInChief,
          seed.issueNumber,
          seed.publicationFreq,
          seed.issn,
          seed.sections,
        ],
      );
    }

    if (seed.category === 'CD') {
      await client.query(
        `
          INSERT INTO disc_product (
            id,
            release_date,
            genre,
            language,
            total_length
          )
          VALUES ($1, $2, $3, $4, $5)
        `,
        [
          productId,
          seed.releaseDate,
          seed.genre,
          seed.language,
          seed.totalLength,
        ],
      );

      await client.query(
        `
          INSERT INTO cd (id, artist, record_label, track)
          VALUES ($1, $2, $3, $4)
        `,
        [productId, seed.artist, seed.recordLabel, seed.track],
      );
    }

    if (seed.category === 'DVD') {
      await client.query(
        `
          INSERT INTO disc_product (
            id,
            release_date,
            genre,
            language,
            total_length
          )
          VALUES ($1, $2, $3, $4, $5)
        `,
        [
          productId,
          seed.releaseDate,
          seed.genre,
          seed.language,
          seed.totalLength,
        ],
      );

      await client.query(
        `
          INSERT INTO dvd (id, disc_type, director, studio, subtitles)
          VALUES ($1, $2, $3, $4, $5)
        `,
        [productId, seed.discType, seed.director, seed.studio, seed.subtitles],
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }

  console.log(`Seeded product: ${seed.barcode}`);
}

async function main(): Promise<void> {
  const client = await pool.connect();

  try {
    for (const seed of demoProducts) {
      await seedProduct(client, seed);
    }
  } finally {
    client.release();
  }
}

main()
  .then(async () => {
    await pool.end();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await pool.end();
    process.exit(1);
  });
