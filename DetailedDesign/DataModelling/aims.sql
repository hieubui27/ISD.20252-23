CREATE TABLE authors (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE roles (
    id BIGSERIAL PRIMARY KEY,
    role_name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    user_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_pass VARCHAR(255) NOT NULL,
    status VARCHAR(30) NOT NULL
);

CREATE TABLE user_role (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE product (
    id BIGSERIAL PRIMARY KEY,
    barcode VARCHAR(50) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    dimensions VARCHAR(100),
    weight NUMERIC(10, 2) NOT NULL,
    original_value NUMERIC(12, 2) NOT NULL CHECK (original_value >= 0),
    current_price NUMERIC(12, 2) NOT NULL CHECK (current_price >= 0),
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    status VARCHAR(30) NOT NULL,
    image_url TEXT NOT NULL,
    video_url TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE disc_product (
    id BIGINT PRIMARY KEY REFERENCES product(id) ON DELETE CASCADE,
    release_date DATE NOT NULL,
    genre VARCHAR(100) NOT NULL,
    language VARCHAR(45) NOT NULL,
    total_length INTEGER NOT NULL CHECK (total_length >= 0)
);

CREATE TABLE cd (
    id BIGINT PRIMARY KEY REFERENCES disc_product(id) ON DELETE CASCADE,
    artist VARCHAR(100) NOT NULL,
    record_label VARCHAR(100) NOT NULL,
    track TEXT NOT NULL
);

CREATE TABLE dvd (
    id BIGINT PRIMARY KEY REFERENCES disc_product(id) ON DELETE CASCADE,
    disc_type VARCHAR(45) NOT NULL,
    director VARCHAR(100) NOT NULL,
    studio VARCHAR(100) NOT NULL,
    subtitles VARCHAR(255) NOT NULL
);

CREATE TABLE printable_product (
    id BIGINT PRIMARY KEY REFERENCES product(id) ON DELETE CASCADE,
    publisher VARCHAR(150) NOT NULL,
    language VARCHAR(50) NOT NULL,
    publish_date DATE NOT NULL
);

CREATE TABLE book (
    id BIGINT PRIMARY KEY REFERENCES printable_product(id) ON DELETE CASCADE,
    cover_type VARCHAR(50) NOT NULL,
    nb_pages INTEGER NOT NULL CHECK (nb_pages > 0),
    genre VARCHAR(100) NOT NULL
);

CREATE TABLE book_author (
    book_id BIGINT NOT NULL REFERENCES book(id) ON DELETE CASCADE,
    author_id BIGINT NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
    PRIMARY KEY (book_id, author_id)
);

CREATE TABLE newspaper (
    id BIGINT PRIMARY KEY REFERENCES printable_product(id) ON DELETE CASCADE,
    editor_in_chief VARCHAR(100) NOT NULL,
    issue_number VARCHAR(50) NOT NULL,
    publication_freq VARCHAR(50) NOT NULL,
    issn VARCHAR(20) NOT NULL,
    sections TEXT NOT NULL
);

CREATE TABLE orders (
    id BIGSERIAL PRIMARY KEY,
    order_id VARCHAR(50) UNIQUE NOT NULL,
    customer_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    email VARCHAR(150) NOT NULL,
    street_address TEXT NOT NULL,
    province VARCHAR(100) NOT NULL,
    delivery_method VARCHAR(50) NOT NULL,
    delivery_fee NUMERIC(12, 2) NOT NULL CHECK (delivery_fee >= 0),
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
    status VARCHAR(30) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE order_product (
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES product(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
    PRIMARY KEY (order_id, product_id)
);

CREATE TABLE invoice (
    id BIGSERIAL PRIMARY KEY,
    vat_subtotal NUMERIC(12, 2) NOT NULL CHECK (vat_subtotal >= 0),
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
    order_id BIGINT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE "transaction" (
    id BIGSERIAL PRIMARY KEY,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    content TEXT NOT NULL,
    method VARCHAR(45) NOT NULL,
    status VARCHAR(30) NOT NULL,
    invoice_id BIGINT NOT NULL REFERENCES invoice(id) ON DELETE CASCADE
);

CREATE TABLE product_log (
    id BIGSERIAL PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    created_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    product_id BIGINT NOT NULL REFERENCES product(id) ON DELETE CASCADE,
    created_by_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT
);