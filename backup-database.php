<?php
/**
 * Database Backup Script
 * Usage: php backup-database.php
 * 
 * Schedule via cron (daily):
 * 0 2 * * * /usr/bin/php /home/user/public_html/backup-database.php
 */

error_reporting(E_ALL);
ini_set('display_errors', 0);

// ============================================
// CONFIGURATION
// ============================================

// Database credentials
$db_host = 'localhost';
$db_user = 'apple_user';
$db_pass = 'your_password';  // CHANGE THIS
$db_name = 'apple_store_prod';

// Backup settings
$backup_dir = 'backups/';
$max_backups = 30;  // Keep last 30 days
$backup_retention_days = 30;

// ============================================
// SETUP
// ============================================

// Create backup directory
if (!is_dir($backup_dir)) {
  mkdir($backup_dir, 0755, true);
}

// Log file
$log_file = $backup_dir . 'backup.log';

function log_message($message) {
  global $log_file;
  $timestamp = date('Y-m-d H:i:s');
  $log = "[$timestamp] $message\n";
  file_put_contents('php://stderr', $log, FILE_APPEND);
  file_put_contents($log_file, $log, FILE_APPEND);
  echo $message . "\n";
}

// ============================================
// BACKUP FUNCTIONS
// ============================================

function backup_mysql($db_host, $db_user, $db_pass, $db_name, $backup_dir) {
  global $backup_retention_days;
  
  $timestamp = date('Y-m-d_H-i-s');
  $backup_file = $backup_dir . 'mysql_backup_' . $timestamp . '.sql';
  
  log_message("Starting MySQL backup...");
  
  // Escape credentials for shell
  $db_pass_escaped = escapeshellarg($db_pass);
  
  // Execute mysqldump
  $command = "mysqldump --single-transaction --quick --lock-tables=false " .
             "-h " . escapeshellarg($db_host) . " " .
             "-u " . escapeshellarg($db_user) . " " .
             "-p" . $db_pass_escaped . " " .
             escapeshellarg($db_name) . " > " . escapeshellarg($backup_file);
  
  exec($command, $output, $return_code);
  
  if ($return_code === 0) {
    // Get file size
    $file_size = filesize($backup_file);
    $size_mb = round($file_size / 1024 / 1024, 2);
    
    // Compress
    exec("gzip " . escapeshellarg($backup_file), $output, $gzip_return);
    
    if ($gzip_return === 0) {
      $compressed_file = $backup_file . '.gz';
      $compressed_size = round(filesize($compressed_file) / 1024 / 1024, 2);
      log_message("✓ Backup successful: {$compressed_file} ({$compressed_size}MB)");
      return true;
    } else {
      log_message("⚠️ Compression failed: $gzip_return");
      return false;
    }
  } else {
    log_message("❌ Backup failed with code: $return_code");
    return false;
  }
}

function backup_json_files($backup_dir) {
  log_message("Starting JSON files backup...");
  
  $timestamp = date('Y-m-d_H-i-s');
  $backup_file = $backup_dir . 'json_backup_' . $timestamp . '.tar.gz';
  
  $command = "tar -czf " . escapeshellarg($backup_file) . " data/ 2>/dev/null";
  exec($command, $output, $return_code);
  
  if ($return_code === 0) {
    $size_mb = round(filesize($backup_file) / 1024 / 1024, 2);
    log_message("✓ JSON backup successful: {$backup_file} ({$size_mb}MB)");
    return true;
  } else {
    log_message("⚠️ JSON backup failed");
    return false;
  }
}

function cleanup_old_backups($backup_dir, $retention_days) {
  log_message("Cleaning up old backups (older than {$retention_days} days)...");
  
  $files = glob($backup_dir . '*.sql.gz');
  $files = array_merge($files, glob($backup_dir . '*.tar.gz'));
  
  $now = time();
  $deleted_count = 0;
  $freed_space = 0;
  
  foreach ($files as $file) {
    $file_age_days = ($now - filemtime($file)) / 86400;
    
    if ($file_age_days > $retention_days) {
      $file_size = filesize($file);
      if (unlink($file)) {
        $deleted_count++;
        $freed_space += $file_size;
      }
    }
  }
  
  if ($deleted_count > 0) {
    $freed_mb = round($freed_space / 1024 / 1024, 2);
    log_message("✓ Deleted $deleted_count old backup(s), freed {$freed_mb}MB");
  } else {
    log_message("ℹ️ No old backups to delete");
  }
}

function verify_backup($backup_file) {
  log_message("Verifying backup integrity...");
  
  if (!file_exists($backup_file)) {
    log_message("❌ Backup file not found: $backup_file");
    return false;
  }
  
  $file_size = filesize($backup_file);
  
  if ($file_size < 1024) {  // Less than 1KB probably corrupted
    log_message("❌ Backup too small (possibly corrupted): {$file_size} bytes");
    return false;
  }
  
  if (substr($backup_file, -3) === '.gz') {
    // Verify gzip integrity
    $command = "gzip -t " . escapeshellarg($backup_file);
    exec($command, $output, $return_code);
    
    if ($return_code !== 0) {
      log_message("❌ Gzip verification failed");
      return false;
    }
  }
  
  log_message("✓ Backup verification passed");
  return true;
}

function send_notification($subject, $message) {
  // Optional: Send email notification
  // Implement based on your email configuration
}

// ============================================
// MAIN EXECUTION
// ============================================

log_message("╔════════════════════════════════════════╗");
log_message("║     Database Backup Started             ║");
log_message("║     " . date('Y-m-d H:i:s') . "              ║");
log_message("╚════════════════════════════════════════╝");

// Run backups
$mysql_success = backup_mysql($db_host, $db_user, $db_pass, $db_name, $backup_dir);
$json_success = backup_json_files($backup_dir);

// Cleanup
cleanup_old_backups($backup_dir, $backup_retention_days);

// Summary
log_message("📊 Backup Summary:");
log_message("  MySQL:  " . ($mysql_success ? "✓ Success" : "❌ Failed"));
log_message("  JSON:   " . ($json_success ? "✓ Success" : "❌ Failed"));

// Disk space
$disk_usage = exec("du -sh " . escapeshellarg($backup_dir));
log_message("  Storage: $disk_usage");

if ($mysql_success && $json_success) {
  log_message("✅ Backup completed successfully");
  exit(0);
} else {
  log_message("⚠️ Backup completed with errors");
  exit(1);
}
?>
