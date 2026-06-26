-- NocoDB Middleware Example - Import Sample Data
-- This script inserts sample data for testing

-- Insert Authors
INSERT INTO authors (name, bio, birth_date) VALUES
('J.K. Rowling', 'British author best known for the Harry Potter series', '1965-07-31'),
('George Orwell', 'English novelist, essayist, journalist and critic', '1903-06-25'),
('Jane Austen', 'English novelist known for her social commentary', '1775-12-16'),
('Stephen King', 'American author of horror, supernatural fiction, suspense, and fantasy', '1947-09-21'),
('Agatha Christie', 'English writer known for her detective novels', '1890-09-15');

-- Insert Books
INSERT INTO books (title, description, published_year, isbn, price, author_id) VALUES
('Harry Potter and the Philosopher''s Stone', 'The first novel in the Harry Potter series', 1997, '9780747532743', 12.99, 1),
('Harry Potter and the Chamber of Secrets', 'The second novel in the Harry Potter series', 1998, '9780747538486', 12.99, 1),
('1984', 'A dystopian social science fiction novel', 1949, '9780451524935', 9.99, 2),
('Animal Farm', 'An allegorical novella reflecting events leading up to the Russian Revolution', 1945, '9780451526342', 8.99, 2),
('Pride and Prejudice', 'A romantic novel of manners', 1813, '9780141439518', 7.99, 3),
('Emma', 'A novel about the perils of misconstrued romance', 1815, '9780141439587', 7.99, 3),
('The Shining', 'A horror novel about a haunted hotel', 1977, '9780385121675', 10.99, 4),
('It', 'A horror novel about a shape-shifting entity', 1986, '9780670813020', 14.99, 4),
('Murder on the Orient Express', 'A detective novel featuring Hercule Poirot', 1934, '9780007119318', 9.99, 5),
('And Then There Were None', 'A mystery novel about ten strangers trapped on an island', 1939, '9780007136520', 8.99, 5);

-- Insert Users (passwords are hashed in the application)
INSERT INTO users (username, email, password_hash, role) VALUES
('admin', 'admin@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin'),
('alice', 'alice@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user'),
('bob', 'bob@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user'),
('guest', 'guest@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'guest');

-- Insert Favorites (sample user preferences)
INSERT INTO favorites (user_id, book_id) VALUES
(2, 1), -- alice likes Harry Potter 1
(2, 3), -- alice likes 1984
(3, 5), -- bob likes Pride and Prejudice
(3, 7); -- bob likes The Shining
