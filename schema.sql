-- Apple Commerce schema aligned with the current storefront/admin runtime.

CREATE DATABASE IF NOT EXISTS apple_store_prod
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE apple_store_prod;

DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS analytics;
DROP TABLE IF EXISTS wishlist;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id VARCHAR(50) PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) DEFAULT '',
  phone VARCHAR(20) DEFAULT '',
  role VARCHAR(50) DEFAULT 'customer',
  addresses JSON,
  preferences JSON,
  birth_date VARCHAR(50) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_email (email),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE products (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description LONGTEXT,
  category VARCHAR(100) DEFAULT '',
  brand VARCHAR(100) DEFAULT 'Apple',
  sku VARCHAR(100) DEFAULT NULL,
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount INT DEFAULT 0,
  quantity INT DEFAULT 0,
  availability VARCHAR(50) DEFAULT 'in-stock',
  colors JSON,
  storage JSON,
  specs JSON,
  image VARCHAR(500) DEFAULT '',
  gallery JSON,
  variants JSON,
  `condition` VARCHAR(50) DEFAULT 'New',
  badge VARCHAR(50) DEFAULT '',
  rating DECIMAL(3,2) DEFAULT 0,
  reviews INT DEFAULT 0,
  warranty INT DEFAULT 12,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_sku (sku),
  INDEX idx_category (category),
  INDEX idx_price (price),
  INDEX idx_quantity (quantity),
  INDEX idx_availability (availability),
  FULLTEXT KEY ft_product_search (name, description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE orders (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) DEFAULT NULL,
  customer JSON,
  items JSON NOT NULL,
  subtotal DECIMAL(12,2) DEFAULT 0,
  shipping DECIMAL(12,2) DEFAULT 0,
  tax DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_method VARCHAR(50) DEFAULT 'cod',
  status VARCHAR(50) DEFAULT 'pending',
  tracking VARCHAR(100) DEFAULT '',
  carrier VARCHAR(100) DEFAULT '',
  estimated_delivery DATETIME DEFAULT NULL,
  stock_reserved TINYINT(1) DEFAULT 0,
  cancellation_reason TEXT DEFAULT NULL,
  customer_update_message TEXT DEFAULT NULL,
  processing_date DATETIME DEFAULT NULL,
  shipped_date DATETIME DEFAULT NULL,
  delivered_date DATETIME DEFAULT NULL,
  cancelled_at DATETIME DEFAULT NULL,
  stock_reserved_at DATETIME DEFAULT NULL,
  stock_released_at DATETIME DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_status (status),
  INDEX idx_created (created_at),
  INDEX idx_payment_method (payment_method)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE notifications (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) DEFAULT NULL,
  title VARCHAR(255) DEFAULT 'Notification',
  message LONGTEXT,
  type VARCHAR(50) DEFAULT 'info',
  is_read TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_notification_user (user_id),
  INDEX idx_notification_read (is_read),
  INDEX idx_notification_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE reviews (
  id VARCHAR(50) PRIMARY KEY,
  product_id VARCHAR(50) DEFAULT NULL,
  user_id VARCHAR(50) DEFAULT NULL,
  rating INT DEFAULT 5,
  title VARCHAR(255) DEFAULT '',
  comment LONGTEXT,
  helpful INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_review_product (product_id),
  INDEX idx_review_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE wishlist (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) DEFAULT NULL,
  product_id VARCHAR(50) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_wishlist (user_id, product_id),
  INDEX idx_wishlist_user (user_id),
  INDEX idx_wishlist_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE analytics (
  id VARCHAR(50) PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  event_data JSON,
  user_id VARCHAR(50) DEFAULT NULL,
  session_id VARCHAR(100) DEFAULT '',
  url VARCHAR(300) DEFAULT '',
  ip_address VARCHAR(64) DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_event_type (event_type),
  INDEX idx_analytics_user (user_id),
  INDEX idx_session_id (session_id),
  INDEX idx_analytics_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE audit_logs (
  id VARCHAR(50) PRIMARY KEY,
  action VARCHAR(100) DEFAULT '',
  entity_type VARCHAR(100) DEFAULT '',
  entity_id VARCHAR(50) DEFAULT '',
  old_value JSON,
  new_value JSON,
  admin_id VARCHAR(50) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_action (action),
  INDEX idx_audit_entity (entity_type, entity_id),
  INDEX idx_audit_admin (admin_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'apple_user'@'localhost' IDENTIFIED BY 'change_this_password';
GRANT ALL PRIVILEGES ON apple_store_prod.* TO 'apple_user'@'localhost';
FLUSH PRIVILEGES;

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
