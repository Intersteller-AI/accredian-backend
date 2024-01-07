-- @block
CREATE TABLE Users (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  email VARCHAR(255) NOT NULL UNIQUE,
  user_name VARCHAR(255) NOT NULL,
  user_password VARCHAR(255) NOT NULL,
  avatar TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON
  UPDATE CURRENT_TIMESTAMP
);
-- @block
DROP TABLE Users;
-- @block
INSERT INTO Users (email, user_name, user_password)
VALUES ("priyanshu23gmail.com", "pry", "123456");
-- @block
SELECT *
FROM Users
ORDER BY created_at DESC;
-- @block
SELECT email
FROM Users
ORDER BY created_at ASC
LIMIT 2;
-- @block
SELECT email
FROM Users
WHERE email LIKE 's%';
-- @block
CREATE INDEX email_index ON Users (email);
-- @block
CREATE INDEX email_index ON Users(email);
-- @block
CREATE TABLE Articles (
  id CHAR(36) DEFAULT (UUID()),
  article_image TEXT,
  title VARCHAR(255),
  body TEXT,
  user_id CHAR(36) DEFAULT (UUID()),
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES Users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON
    UPDATE CURRENT_TIMESTAMP
);
-- @block
INSERT INTO Articles (user_id, title)
VALUES (
    "fb3ac186-ad96-11ee-966c-088fc326c169",
    "this is new title"
  );
-- @block
SELECT *
FROM Articles
ORDER BY created_at DESC;
-- @block
SELECT *
FROM Users
  INNER JOIN Articles ON Users.id = Articles.user_id WHERE Users.id = 'fb3ac186-ad96-11ee-966c-088fc326c169';
-- @block
DROP TABLE Articles;