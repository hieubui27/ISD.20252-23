CREATE TABLE authors (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE roles (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    role_name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE users (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_pass VARCHAR(255) NOT NULL,
    status VARCHAR(50)
);

CREATE TABLE product (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    barcode VARCHAR(100) UNIQUE,
    dimensions VARCHAR(100),
    weight NUMERIC(10, 2),
    original_value NUMERIC(15, 2),
    current_price NUMERIC(15, 2) CHECK (current_price >= 0),
    quantity INT DEFAULT 0 CHECK (quantity >= 0),
    status VARCHAR(50),
    image_url TEXT,
    video_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_log (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id INT REFERENCES product(id) ON DELETE CASCADE, 
    user_id INT REFERENCES users(id) ON DELETE SET NULL,    
    action VARCHAR(255) NOT NULL,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE disc_product (
    id INT PRIMARY KEY REFERENCES product(id) ON DELETE CASCADE,
    release_date DATE,
    genre VARCHAR(100),
    total_length INT,
    language VARCHAR(50)
);

CREATE TABLE cd (
    id INT PRIMARY KEY REFERENCES disc_product(id) ON DELETE CASCADE,
    artist VARCHAR(255),
    record_label VARCHAR(255)
);

CREATE TABLE cd_track (
    cd_id INT REFERENCES cd(id) ON DELETE CASCADE,
    track VARCHAR(255) NOT NULL,
    PRIMARY KEY (cd_id, track)
);

CREATE TABLE dvd (
    id INT PRIMARY KEY REFERENCES disc_product(id) ON DELETE CASCADE,
    director VARCHAR(255),
    disc_type VARCHAR(50),
    studio VARCHAR(255),
    subtitles VARCHAR(255)
);

CREATE TABLE printable_product (
    id INT PRIMARY KEY REFERENCES product(id) ON DELETE CASCADE,
    publisher VARCHAR(255),
    publish_date DATE,
    language VARCHAR(50)
);

CREATE TABLE book (
    id INT PRIMARY KEY REFERENCES printable_product(id) ON DELETE CASCADE,
    cover_type VARCHAR(50),
    nb_pages INT,
    genre VARCHAR(100)
);

CREATE TABLE book_author (
    book_id INT REFERENCES book(id) ON DELETE CASCADE,
    author_id INT REFERENCES authors(id) ON DELETE CASCADE,
    PRIMARY KEY (book_id, author_id)
);

CREATE TABLE newspaper (
    id INT PRIMARY KEY REFERENCES printable_product(id) ON DELETE CASCADE,
    editor_in_chief VARCHAR(255),
    issue_number VARCHAR(100),
    publication_freq VARCHAR(100),
    issn VARCHAR(50),
    sections TEXT
);

CREATE TABLE orders (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    status VARCHAR(50),
    subtotal NUMERIC(15, 2),
    delivery_fee NUMERIC(15, 2),
    email VARCHAR(255),
    customer_name VARCHAR(255),
    phone_number VARCHAR(20),
    street_address TEXT,
    province VARCHAR(100),
    delivery_method VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_product (
    order_id INT REFERENCES orders(id) ON DELETE CASCADE,
    product_id INT REFERENCES product(id) ON DELETE RESTRICT,
    quantity INT NOT NULL CHECK (quantity > 0),
    price NUMERIC(15, 2) NOT NULL CHECK (price >= 0),
    PRIMARY KEY (order_id, product_id)
);

CREATE TABLE invoice (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id INT UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
    vat_subtotal NUMERIC(15, 2),
    total_amount NUMERIC(15, 2)
);

CREATE TABLE transaction (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    invoice_id INT REFERENCES invoice(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2),
    content TEXT,
    method VARCHAR(100),
    status VARCHAR(50)
);

CREATE TABLE user_role (
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    role_id INT REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);