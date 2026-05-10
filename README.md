# Apple Store VN — Hướng Dẫn Cài Đặt & Triển Khai

Ứng dụng thương mại điện tử bán thiết bị Apple tại Việt Nam.  
**Công nghệ:** HTML/CSS/JS (frontend) + PHP 8+ / MariaDB (backend)  
**Phương thức thanh toán:** Thanh toán khi nhận hàng (COD) — không tích hợp cổng thanh toán trực tuyến.

---

## 1. Chạy Trên Máy Cục Bộ (Local)

### Yêu cầu
| Phần mềm | Phiên bản tối thiểu |
|---|---|
| PHP | 8.0+ |
| MariaDB / MySQL | 10.4+ |
| phpMyAdmin (tuỳ chọn) | bất kỳ |

### Bước 1 — Cài đặt PHP và MariaDB (macOS với Homebrew)

```bash
brew install php mariadb
brew services start mariadb
```

> **Linux/Windows:** Cài XAMPP hoặc Laragon, hoặc dùng gói php-cli + mysql-server của hệ điều hành.

### Bước 2 — Tạo cơ sở dữ liệu

```bash
# Đăng nhập vào MariaDB (macOS Homebrew dùng tài khoản hệ thống, không cần mật khẩu)
mysql -u $(whoami)

# Hoặc nếu có tài khoản root:
mysql -u root -p
```

Trong MySQL shell:

```sql
CREATE DATABASE apple_store_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

### Bước 3 — Import schema

```bash
mysql -u $(whoami) apple_store_prod < schema.sql
```

> Thay `$(whoami)` bằng tên người dùng MariaDB của bạn nếu khác.

### Bước 4 — Cấu hình kết nối CSDL

Mở file `api/config.php` và kiểm tra/sửa các dòng:

```php
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_USER', getenv('DB_USER') ?: 'TÊN_NGƯỜI_DÙNG_MARIADB');
define('DB_PASS', getenv('DB_PASS') ?: '');
define('DB_NAME', getenv('DB_NAME') ?: 'apple_store_prod');
```

Thay `TÊN_NGƯỜI_DÙNG_MARIADB` bằng tên user thực tế (ví dụ: `root`).

### Bước 5 — Khởi động server PHP

```bash
# Chạy từ thư mục gốc của dự án
php -S localhost:8080 router.php
```

### Bước 6 — Mở trình duyệt

```
http://localhost:8080
```

Trang admin:

```
http://localhost:8080/admin
```

---

## 2. Triển Khai Lên cPanel (Tenten)

### Bước 1 — Upload file lên hosting

1. Đăng nhập **cPanel** của tenten → mở **File Manager**.
2. Vào thư mục `public_html/`.
3. Upload toàn bộ file dự án vào `public_html/` (hoặc một thư mục con nếu muốn).

> **Lưu ý:** Không cần upload `data/logs/` và `data/uploads/` — cPanel sẽ tự tạo khi cần.

### Bước 2 — Tạo CSDL MySQL trên cPanel

1. Trong cPanel → **MySQL Databases**.
2. Tạo database mới, ví dụ: `tenuser_applestore`.
3. Tạo user MySQL mới và gán quyền **All Privileges** cho database đó.
4. Ghi lại: **Host** (thường là `localhost`), **Database name**, **Username**, **Password**.

### Bước 3 — Import schema qua phpMyAdmin

1. Trong cPanel → **phpMyAdmin**.
2. Chọn database vừa tạo.
3. Tab **Import** → chọn file `schema.sql` → nhấn **Thực thi (Go)**.

### Bước 4 — Cập nhật thông tin kết nối CSDL

Mở `api/config.php` trên server (qua File Manager hoặc FTP):

```php
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_USER', getenv('DB_USER') ?: 'tenuser_dbuser');   // ← sửa
define('DB_PASS', getenv('DB_PASS') ?: 'mat_khau_db');       // ← sửa
define('DB_NAME', getenv('DB_NAME') ?: 'tenuser_applestore');// ← sửa
```

> **Bảo mật hơn:** Thay vì sửa trực tiếp, hãy đặt biến môi trường trong cPanel → **Environment Variables** (nếu có) hoặc trong file `.htaccess`:
> ```apache
> SetEnv DB_USER tenuser_dbuser
> SetEnv DB_PASS mat_khau_db
> SetEnv DB_NAME tenuser_applestore
> ```

### Bước 5 — Kiểm tra .htaccess

File `.htaccess` đã được cấu hình sẵn tại thư mục gốc. Đảm bảo cPanel đã bật **mod_rewrite**:

- cPanel → **Apache Handlers** hoặc liên hệ hỗ trợ tenten để bật `mod_rewrite`.

### Bước 6 — Phân quyền thư mục

Qua File Manager hoặc SSH:

```bash
chmod 755 data/
chmod 755 data/logs/
chmod 755 data/uploads/
```

### Bước 7 — Kiểm tra

Mở trình duyệt và truy cập domain của bạn:

```
https://yourdomain.com
https://yourdomain.com/admin
```

---

## 3. Cài Đặt Sao Lưu Tự Động (Tuỳ Chọn)

Trong cPanel → **Cron Jobs**, thêm lệnh sau để tự động backup lúc 2 giờ sáng mỗi ngày:

```
0 2 * * * /usr/local/bin/php /home/USERNAME/public_html/backup-database.php
```

> Thay `USERNAME` bằng tên tài khoản cPanel của bạn.

File backup sẽ được lưu tại `data/backups/` (tự tạo).

---

## 4. Tài Khoản Admin Mặc Định

Sau khi import `schema.sql`, đăng ký tài khoản qua trang `/register.html` rồi:

1. Vào phpMyAdmin → bảng `users`.
2. Tìm tài khoản vừa tạo.
3. Sửa cột `role` từ `customer` thành `admin`.

---

## 5. Cấu Trúc Thư Mục Quan Trọng

```
public_html/
├── index.html          ← Trang chủ
├── login.html          ← Đăng nhập
├── register.html       ← Đăng ký
├── cart.html           ← Giỏ hàng
├── checkout.html       ← Thanh toán
├── orders.html         ← Lịch sử đơn hàng
├── profile.html        ← Hồ sơ người dùng
├── admin/              ← Trang quản trị
├── api/                ← Backend PHP
│   └── config.php      ← ⚠️ Cấu hình CSDL tại đây
├── assets/             ← CSS, JS, hình ảnh
├── schema.sql          ← Script tạo bảng CSDL
├── router.php          ← Điều hướng API (CLI)
├── .htaccess           ← Cấu hình Apache (cPanel)
└── backup-database.php ← Script sao lưu CSDL
```

---

## 6. Xử Lý Sự Cố

| Vấn đề | Giải pháp |
|---|---|
| Trang trắng / 500 | Kiểm tra thông tin CSDL trong `api/config.php` |
| API trả về 404 | Đảm bảo `.htaccess` đúng và `mod_rewrite` đã bật |
| Không kết nối được CSDL | Kiểm tra host, user, password, tên database trong cPanel |
| Ảnh sản phẩm không hiển thị | Đảm bảo URL ảnh hợp lệ khi thêm sản phẩm |
| Đăng nhập thất bại | Kiểm tra tài khoản đã có trong bảng `users`, role phải là `admin` |
