-- Run the whole file with:  psql -U postgres -f database.sql
-- (it must be run with psql: it uses \gexec and \c)

-- ============================================================
-- 1. Create the database (only if it doesn't exist yet)
-- ============================================================
SELECT 'CREATE DATABASE instagram'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'instagram')\gexec

\c instagram

-- ============================================================
-- 2. Tables
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    email      VARCHAR(100) UNIQUE NOT NULL,
    password   VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS posts (
    id          SERIAL PRIMARY KEY,
    user_id     INT REFERENCES users(id) ON DELETE CASCADE,
    image_url   TEXT NOT NULL,
    description TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 3. Sample data (optional, delete this block if you don't want it)
-- ============================================================
INSERT INTO users (name, email, password) VALUES
    ('agus',  'agus@gmail.com',  '1234'),
    ('maria', 'maria@gmail.com', '1234'),
    ('lucas', 'lucas@gmail.com', '1234')
ON CONFLICT (email) DO NOTHING;

INSERT INTO posts (user_id, image_url, description) VALUES
    (1, 'https://picsum.photos/id/10/600/600', 'Walk in the forest'),
    (1, 'https://picsum.photos/id/20/600/600', 'Desk setup'),
    (2, 'https://picsum.photos/id/30/600/600', 'Coffee time'),
    (2, 'https://picsum.photos/id/40/600/600', 'Weekend vibes'),
    (3, 'https://picsum.photos/id/50/600/600', 'New camera');

-- ============================================================
-- 4. Queries used by the API (reference, run them by hand to test)
-- ============================================================

-- POST /users   (register)
-- INSERT INTO users (name, email, password) VALUES ('name', 'email', 'password') RETURNING id;

-- POST /login
-- SELECT id, name FROM users WHERE email = 'email' AND password = 'password';

-- GET /users/{id}
-- SELECT id, name FROM users WHERE id = 1;

-- GET /posts   (feed, newest first)
-- SELECT p.id, p.user_id, p.image_url, p.description, u.name
-- FROM posts p JOIN users u ON u.id = p.user_id
-- ORDER BY p.created_at DESC;

-- GET /users/{id}/posts   (profile)
-- SELECT p.id, p.user_id, p.image_url, p.description, u.name
-- FROM posts p JOIN users u ON u.id = p.user_id
-- WHERE p.user_id = 1
-- ORDER BY p.created_at DESC;

-- POST /posts
-- INSERT INTO posts (user_id, image_url, description) VALUES (1, 'url', 'text') RETURNING id;

-- PUT /posts/{id}   (edit description, only if it's yours)
-- UPDATE posts SET description = 'new text' WHERE id = 1 AND user_id = 1;

-- DELETE /posts/{id}   (only if it's yours)
-- DELETE FROM posts WHERE id = 1 AND user_id = 1;