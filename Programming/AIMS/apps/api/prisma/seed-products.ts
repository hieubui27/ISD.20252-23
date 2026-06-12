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

  // ---------------------------------------------------------------------------
  // Real catalog products (all ACTIVE and in stock) for customer browsing.
  // ---------------------------------------------------------------------------

  // ----- BOOKS -----
  {
    barcode: 'AIMS-BOOK-1001',
    category: 'BOOK',
    title: 'The Pragmatic Programmer',
    description:
      'Your journey to mastery. A classic guide on pragmatic software craftsmanship, packed with timeless tips for writing better code.',
    dimensions: 'height=23;width=18;length=3',
    weight: 600,
    originalValue: 420000,
    currentPrice: 365000,
    quantity: 25,
    status: 'ACTIVE',
    imageUrl:
      'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=900&auto=format&fit=crop',
    videoUrl: '',
    publisher: 'Addison-Wesley',
    language: 'English',
    publishDate: '2019-09-13',
    coverType: 'Hardcover',
    nbPages: 352,
    genre: 'Software Engineering',
    authors: ['Andrew Hunt', 'David Thomas'],
  },
  {
    barcode: 'AIMS-BOOK-1002',
    category: 'BOOK',
    title: 'Sapiens: A Brief History of Humankind',
    description:
      'Yuval Noah Harari explores how Homo sapiens came to dominate the world, from the cognitive revolution to the present day.',
    dimensions: 'height=24;width=16;length=4',
    weight: 540,
    originalValue: 320000,
    currentPrice: 279000,
    quantity: 40,
    status: 'ACTIVE',
    imageUrl:
      'https://images.unsplash.com/photo-1592496431122-2349e0fbc666?w=900&auto=format&fit=crop',
    videoUrl: '',
    publisher: 'Harper',
    language: 'English',
    publishDate: '2015-02-10',
    coverType: 'Paperback',
    nbPages: 464,
    genre: 'History',
    authors: ['Yuval Noah Harari'],
  },
  {
    barcode: 'AIMS-BOOK-1003',
    category: 'BOOK',
    title: 'Dế Mèn Phiêu Lưu Ký',
    description:
      'Tác phẩm văn học thiếu nhi kinh điển của nhà văn Tô Hoài, kể về hành trình phiêu lưu của chú Dế Mèn.',
    dimensions: 'height=20;width=14;length=2',
    weight: 280,
    originalValue: 90000,
    currentPrice: 72000,
    quantity: 60,
    status: 'ACTIVE',
    imageUrl:
      'https://images.unsplash.com/photo-1535905557558-afc4877a26fc?w=900&auto=format&fit=crop',
    videoUrl: '',
    publisher: 'Nhà xuất bản Kim Đồng',
    language: 'Vietnamese',
    publishDate: '2022-06-01',
    coverType: 'Paperback',
    nbPages: 160,
    genre: 'Children',
    authors: ['Tô Hoài'],
  },
  {
    barcode: 'AIMS-BOOK-1004',
    category: 'BOOK',
    title: 'Atomic Habits',
    description:
      'An easy and proven way to build good habits and break bad ones, with practical strategies grounded in behavioral science.',
    dimensions: 'height=22;width=15;length=2',
    weight: 360,
    originalValue: 250000,
    currentPrice: 210000,
    quantity: 50,
    status: 'ACTIVE',
    imageUrl:
      'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=900&auto=format&fit=crop',
    videoUrl: '',
    publisher: 'Avery',
    language: 'English',
    publishDate: '2018-10-16',
    coverType: 'Hardcover',
    nbPages: 320,
    genre: 'Self-help',
    authors: ['James Clear'],
  },
  {
    barcode: 'AIMS-BOOK-1005',
    category: 'BOOK',
    title: 'Design Patterns: Elements of Reusable OO Software',
    description:
      'The seminal "Gang of Four" catalog of 23 classic object-oriented design patterns used across modern software design.',
    dimensions: 'height=24;width=17;length=3',
    weight: 700,
    originalValue: 520000,
    currentPrice: 450000,
    quantity: 18,
    status: 'ACTIVE',
    imageUrl:
      'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=900&auto=format&fit=crop',
    videoUrl: '',
    publisher: 'Addison-Wesley',
    language: 'English',
    publishDate: '1994-10-31',
    coverType: 'Hardcover',
    nbPages: 395,
    genre: 'Software Engineering',
    authors: [
      'Erich Gamma',
      'Richard Helm',
      'Ralph Johnson',
      'John Vlissides',
    ],
  },

  // ----- CDs -----
  {
    barcode: 'AIMS-CD-2001',
    category: 'CD',
    title: 'The Dark Side of the Moon',
    description:
      'Pink Floyd’s landmark 1973 progressive-rock album, remastered. A seamless journey through conflict, greed and time.',
    dimensions: 'height=12;width=14;length=1',
    weight: 100,
    originalValue: 320000,
    currentPrice: 289000,
    quantity: 30,
    status: 'ACTIVE',
    imageUrl:
      'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=900&auto=format&fit=crop',
    videoUrl: '',
    releaseDate: '1973-03-01',
    genre: 'Progressive Rock',
    language: 'English',
    totalLength: 43,
    artist: 'Pink Floyd',
    recordLabel: 'Harvest',
    track:
      'Speak to Me, Breathe, On the Run, Time, The Great Gig in the Sky, Money, Us and Them, Any Colour You Like, Brain Damage, Eclipse',
  },
  {
    barcode: 'AIMS-CD-2002',
    category: 'CD',
    title: '25',
    description:
      'Adele’s acclaimed 2015 album featuring the global hit "Hello" and a collection of soulful pop ballads.',
    dimensions: 'height=12;width=14;length=1',
    weight: 95,
    originalValue: 280000,
    currentPrice: 245000,
    quantity: 35,
    status: 'ACTIVE',
    imageUrl:
      'https://images.unsplash.com/photo-1458560871784-56d23406c091?w=900&auto=format&fit=crop',
    videoUrl: '',
    releaseDate: '2015-11-20',
    genre: 'Pop',
    language: 'English',
    totalLength: 48,
    artist: 'Adele',
    recordLabel: 'XL Recordings',
    track:
      'Hello, Send My Love, I Miss You, When We Were Young, Remedy, Water Under the Bridge, River Lea, Love in the Dark, Million Years Ago, All I Ask, Sweetest Devotion',
  },
  {
    barcode: 'AIMS-CD-2003',
    category: 'CD',
    title: 'Thinking Out Loud (Acoustic Sessions)',
    description:
      'A warm acoustic collection of contemporary pop hits, perfect for relaxed evenings.',
    dimensions: 'height=12;width=14;length=1',
    weight: 92,
    originalValue: 210000,
    currentPrice: 179000,
    quantity: 28,
    status: 'ACTIVE',
    imageUrl:
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=900&auto=format&fit=crop',
    videoUrl: '',
    releaseDate: '2021-08-10',
    genre: 'Acoustic Pop',
    language: 'English',
    totalLength: 41,
    artist: 'Various Artists',
    recordLabel: 'AIMS Records',
    track:
      'Thinking Out Loud, Perfect, Photograph, All of Me, Say You Won’t Let Go',
  },
  {
    barcode: 'AIMS-CD-2004',
    category: 'CD',
    title: 'Trịnh Công Sơn - Best Collection',
    description:
      'Tuyển tập những ca khúc bất hủ của nhạc sĩ Trịnh Công Sơn, được phối khí và thu âm lại.',
    dimensions: 'height=12;width=14;length=1',
    weight: 98,
    originalValue: 180000,
    currentPrice: 159000,
    quantity: 45,
    status: 'ACTIVE',
    imageUrl:
      'https://images.unsplash.com/photo-1471478331149-c72f17e33c73?w=900&auto=format&fit=crop',
    videoUrl: '',
    releaseDate: '2020-04-01',
    genre: 'Vietnamese Ballad',
    language: 'Vietnamese',
    totalLength: 52,
    artist: 'Various Artists',
    recordLabel: 'Phương Nam Phim',
    track:
      'Diễm Xưa, Hạ Trắng, Cát Bụi, Một Cõi Đi Về, Nhớ Mùa Thu Hà Nội, Để Gió Cuốn Đi',
  },

  // ----- DVDs -----
  {
    barcode: 'AIMS-DVD-3001',
    category: 'DVD',
    title: 'Inception',
    description:
      'Christopher Nolan’s mind-bending thriller about a thief who steals corporate secrets through dream-sharing technology.',
    dimensions: 'height=19;width=13;length=2',
    weight: 150,
    originalValue: 250000,
    currentPrice: 199000,
    quantity: 22,
    status: 'ACTIVE',
    imageUrl:
      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=900&auto=format&fit=crop',
    videoUrl: '',
    releaseDate: '2010-07-16',
    genre: 'Sci-Fi Thriller',
    language: 'English',
    totalLength: 148,
    discType: 'DVD-9',
    director: 'Christopher Nolan',
    studio: 'Warner Bros.',
    subtitles: 'English, Vietnamese',
  },
  {
    barcode: 'AIMS-DVD-3002',
    category: 'DVD',
    title: 'Spirited Away',
    description:
      'Hayao Miyazaki’s Academy Award-winning animated masterpiece about a girl who enters a world of spirits.',
    dimensions: 'height=19;width=13;length=2',
    weight: 145,
    originalValue: 260000,
    currentPrice: 220000,
    quantity: 26,
    status: 'ACTIVE',
    imageUrl:
      'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=900&auto=format&fit=crop',
    videoUrl: '',
    releaseDate: '2001-07-20',
    genre: 'Animation/Fantasy',
    language: 'Japanese',
    totalLength: 125,
    discType: 'DVD-9',
    director: 'Hayao Miyazaki',
    studio: 'Studio Ghibli',
    subtitles: 'English, Vietnamese, Japanese',
  },
  {
    barcode: 'AIMS-DVD-3003',
    category: 'DVD',
    title: 'The Shawshank Redemption',
    description:
      'Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.',
    dimensions: 'height=19;width=13;length=2',
    weight: 150,
    originalValue: 230000,
    currentPrice: 189000,
    quantity: 20,
    status: 'ACTIVE',
    imageUrl:
      'https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=900&auto=format&fit=crop',
    videoUrl: '',
    releaseDate: '1994-09-23',
    genre: 'Drama',
    language: 'English',
    totalLength: 142,
    discType: 'DVD-9',
    director: 'Frank Darabont',
    studio: 'Columbia Pictures',
    subtitles: 'English, Vietnamese',
  },
  {
    barcode: 'AIMS-DVD-3004',
    category: 'DVD',
    title: 'Parasite',
    description:
      'Bong Joon-ho’s Palme d’Or and Best Picture winning dark comedy thriller about two families from different classes.',
    dimensions: 'height=19;width=13;length=2',
    weight: 148,
    originalValue: 270000,
    currentPrice: 235000,
    quantity: 24,
    status: 'ACTIVE',
    imageUrl:
      'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=900&auto=format&fit=crop',
    videoUrl: '',
    releaseDate: '2019-05-30',
    genre: 'Thriller/Drama',
    language: 'Korean',
    totalLength: 132,
    discType: 'Blu-ray',
    director: 'Bong Joon-ho',
    studio: 'CJ Entertainment',
    subtitles: 'English, Vietnamese, Korean',
  },

  // ----- NEWSPAPERS -----
  {
    barcode: 'AIMS-NEWS-4001',
    category: 'NEWSPAPER',
    title: 'Tuổi Trẻ',
    description:
      'Nhật báo hàng đầu Việt Nam, cập nhật tin tức thời sự, kinh tế, giáo dục và đời sống mỗi ngày.',
    dimensions: 'height=42;width=29;length=1',
    weight: 200,
    originalValue: 8000,
    currentPrice: 6000,
    quantity: 100,
    status: 'ACTIVE',
    imageUrl:
      'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=900&auto=format&fit=crop',
    videoUrl: '',
    publisher: 'Báo Tuổi Trẻ',
    language: 'Vietnamese',
    publishDate: '2026-06-09',
    editorInChief: 'Lê Thế Chữ',
    issueNumber: 'No. 152/2026',
    publicationFreq: 'Daily',
    issn: '1859-1108',
    sections: 'Thời sự, Kinh tế, Giáo dục, Thể thao, Văn hóa',
  },
  {
    barcode: 'AIMS-NEWS-4002',
    category: 'NEWSPAPER',
    title: 'The Economist',
    description:
      'Weekly international newspaper covering global politics, business, finance, science and technology.',
    dimensions: 'height=28;width=21;length=1',
    weight: 220,
    originalValue: 150000,
    currentPrice: 129000,
    quantity: 55,
    status: 'ACTIVE',
    imageUrl:
      'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=900&auto=format&fit=crop',
    videoUrl: '',
    publisher: 'The Economist Group',
    language: 'English',
    publishDate: '2026-06-06',
    editorInChief: 'Zanny Minton Beddoes',
    issueNumber: 'Vol. 451 No. 9401',
    publicationFreq: 'Weekly',
    issn: '0013-0613',
    sections: 'World, Business, Finance, Science, Technology',
  },
  {
    barcode: 'AIMS-NEWS-4003',
    category: 'NEWSPAPER',
    title: 'National Geographic',
    description:
      'Monthly magazine renowned for stunning photography and in-depth reporting on science, nature and culture.',
    dimensions: 'height=26;width=17;length=1',
    weight: 260,
    originalValue: 180000,
    currentPrice: 155000,
    quantity: 48,
    status: 'ACTIVE',
    imageUrl:
      'https://images.unsplash.com/photo-1532153975070-2e9ab71f1b14?w=900&auto=format&fit=crop',
    videoUrl: '',
    publisher: 'National Geographic Partners',
    language: 'English',
    publishDate: '2026-06-01',
    editorInChief: 'Nathan Lump',
    issueNumber: 'June 2026',
    publicationFreq: 'Monthly',
    issn: '0027-9358',
    sections: 'Nature, Science, Exploration, Photography',
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
