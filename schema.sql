-- Apple E-Commerce Database Schema
-- MySQL 5.7+ / MariaDB 10.0+
-- Run this script to create all necessary tables

-- ============================================
-- DATABASE
-- ============================================

CREATE DATABASE IF NOT EXISTS apple_store_prod 
DEFAULT CHARACTER SET utf8mb4 
DEFAULT COLLATE utf8mb4_unicode_ci;

USE apple_store_prod;

-- ============================================
-- PRODUCTS TABLE
-- ============================================

CREATE TABLE products (
  id VARCHAR(50) PRIMARY KEY,
  
  -- Basic Info
  name VARCHAR(255) NOT NULL,
  description LONGTEXT,
  category VARCHAR(100),
  brand VARCHAR(100) DEFAULT 'Apple',
  sku VARCHAR(100) UNIQUE,
  
  -- Pricing
  price DECIMAL(10,2) NOT NULL,
  discount INT DEFAULT 0,
  
  -- Stock
  quantity INT DEFAULT 0,
  availability VARCHAR(50) DEFAULT 'in-stock',
  
  -- Specifications
  colors JSON,
  storage JSON,
  specs JSON,
  
  -- Media
  image VARCHAR(500),
  
  -- Metadata
  rating DECIMAL(3,2),
  reviews INT DEFAULT 0,
  warranty INT DEFAULT 12,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_category (category),
  INDEX idx_brand (brand),
  INDEX idx_price (price),
  INDEX idx_quantity (quantity),
  INDEX idx_availability (availability),
  FULLTEXT INDEX ft_search (name, description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ORDERS TABLE
-- ============================================

CREATE TABLE orders (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50),
  
  -- Order Details
  items JSON NOT NULL,
  subtotal DECIMAL(10,2),
  shipping DECIMAL(10,2),
  tax DECIMAL(10,2),
  total DECIMAL(10,2) NOT NULL,
  
  -- Payment
  payment_method VARCHAR(50),
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending',
  
  -- Shipping
  tracking VARCHAR(100),
  carrier VARCHAR(100),
  estimated_delivery DATETIME,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_user (user_id),
  INDEX idx_status (status),
  INDEX idx_created (created_at),
  INDEX idx_payment (payment_method),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- USERS TABLE
-- ============================================

CREATE TABLE users (
  id VARCHAR(50) PRIMARY KEY,
  
  -- Authentication
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  
  -- Profile
  name VARCHAR(255),
  phone VARCHAR(20),
  
  -- Role
  role VARCHAR(50) DEFAULT 'customer',
  
  -- Additional Data
  addresses JSON,
  preferences JSON,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_email (email),
  INDEX idx_role (role),
  UNIQUE KEY unique_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================

CREATE TABLE notifications (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50),
  
  -- Content
  title VARCHAR(255),
  message LONGTEXT,
  type VARCHAR(50),
  
  -- Status
  read BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_user (user_id),
  INDEX idx_read (read),
  INDEX idx_type (type),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- REVIEWS TABLE
-- ============================================

CREATE TABLE reviews (
  id VARCHAR(50) PRIMARY KEY,
  product_id VARCHAR(50),
  user_id VARCHAR(50),
  
  -- Review Content
  rating INT CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  comment LONGTEXT,
  
  -- Engagement
  helpful INT DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_product (product_id),
  INDEX idx_user (user_id),
  INDEX idx_rating (rating),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- WISHLIST TABLE
-- ============================================

CREATE TABLE wishlist (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50),
  product_id VARCHAR(50),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  UNIQUE KEY unique_wishlist (user_id, product_id),
  INDEX idx_user (user_id),
  INDEX idx_product (product_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ANALYTICS TABLE
-- ============================================

CREATE TABLE analytics (
  id VARCHAR(50) PRIMARY KEY,
  
  -- Event Info
  event_type VARCHAR(100),
  event_data JSON,
  
  -- User Info
  user_id VARCHAR(50),
  session_id VARCHAR(100),
  
  -- Metadata
  user_agent VARCHAR(500),
  ip_address VARCHAR(45),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_event (event_type),
  INDEX idx_user (user_id),
  INDEX idx_session (session_id),
  INDEX idx_created (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- AUDIT LOG TABLE
-- ============================================

CREATE TABLE audit_logs (
  id VARCHAR(50) PRIMARY KEY,
  
  -- Action Info
  action VARCHAR(100),
  entity_type VARCHAR(100),
  entity_id VARCHAR(50),
  
  -- Change Details
  old_value JSON,
  new_value JSON,
  
  -- Admin Info
  admin_id VARCHAR(50),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_action (action),
  INDEX idx_entity (entity_type, entity_id),
  INDEX idx_admin (admin_id),
  INDEX idx_created (created_at),
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- CREATE APPLICATION USER
-- ============================================

-- Create application user (run as root/admin)
-- Change 'your_password' to a strong password!
CREATE USER IF NOT EXISTS 'apple_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON apple_store_prod.* TO 'apple_user'@'localhost';
FLUSH PRIVILEGES;

-- ============================================
-- INSERT SAMPLE DATA
-- ============================================

-- Sample Products
INSERT INTO products (
  id, name, description, category, brand, sku, price, discount, quantity, 
  colors, storage, specs, rating, reviews, warranty, availability
) VALUES 
(
  'prod_iphone15_1',
  'iPhone 15 Pro Max',
  'Latest flagship iPhone with advanced camera system and A17 Pro chip',
  'iphone',
  'Apple',
  'IPHONE15PROMAX',
  29900000,
  5,
  50,
  JSON_ARRAY('Space Black', 'Titanium Blue', 'Titanium Gold'),
  JSON_ARRAY('256GB', '512GB', '1TB'),
  JSON_OBJECT('processor', 'A17 Pro', 'camera', '48MP Main + 12MP Ultra Wide', 'battery', '4000mAh', 'display', '6.7\" Super Retina XDR'),
  4.8,
  2147,
  12,
  'in-stock'
),
(
  'prod_ipad_1',
  'iPad Air 11-inch',
  'Powerful iPad with M2 chip for creative work and multitasking',
  'ipad',
  'Apple',
  'IPADAIR11',
  17900000,
  0,
  35,
  JSON_ARRAY('Space Gray', 'Silver'),
  JSON_ARRAY('128GB', '256GB', '512GB'),
  JSON_OBJECT('processor', 'M2', 'display', '11-inch Liquid Retina'),
  4.7,
  856,
  12,
  'in-stock'
),
(
  'prod_macbook_1',
  'MacBook Pro 14-inch',
  'Powerful professional laptop with M3 Max chip',
  'macbook',
  'Apple',
  'MBPRO14M3MAX',
  35900000,
  0,
  20,
  JSON_ARRAY('Space Black', 'Silver'),
  JSON_ARRAY('512GB', '1TB', '2TB'),
  JSON_OBJECT('processor', 'M3 Max', 'memory', '18GB base', 'display', '14.2-inch Liquid Retina XDR'),
  4.9,
  1234,
  12,
  'in-stock'
);

-- ============================================
-- VERIFY INSTALLATION
-- ============================================

-- Check tables created
SHOW TABLES;

-- Check table structure
DESCRIBE products;
DESCRIBE orders;
DESCRIBE users;

-- Display version info
SELECT VERSION() AS 'MySQL Version',
       DATABASE() AS 'Current Database',
       @@character_set_database AS 'Character Set',
       @@collation_database AS 'Collation';

-- ============================================
-- BACKUP RETENTION POLICY
-- ============================================

-- Create backup event (optional, requires EVENT privilege)
/*
CREATE EVENT IF NOT EXISTS backup_daily ON SCHEDULE
  EVERY 1 DAY
  STARTS CURRENT_TIMESTAMP
  DO
    BEGIN
      -- Add backup logic here
    END;
*/

-- ============================================
-- PERFORMANCE OPTIMIZATION
-- ============================================

-- Analyze tables for query optimization
ANALYZE TABLE products;
ANALYZE TABLE orders;
ANALYZE TABLE users;
ANALYZE TABLE notifications;

-- Optimize tables to reclaim space
OPTIMIZE TABLE products;
OPTIMIZE TABLE orders;
OPTIMIZE TABLE users;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

SELECT 'Database setup completed successfully!' AS 'Status',
       (SELECT COUNT(*) FROM information_schema.TABLES WHERE table_schema = DATABASE()) AS 'Tables Created',
       NOW() AS 'Timestamp';
