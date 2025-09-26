const fs = require('fs');
const path = require('path');

const CACHE_DIR = path.join(__dirname, '..', 'cache', 'invoices');
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function cleanupCache() {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      console.log('Cache directory does not exist');
      return;
    }

    const files = fs.readdirSync(CACHE_DIR);
    const now = Date.now();
    let deletedCount = 0;

    files.forEach(file => {
      const filePath = path.join(CACHE_DIR, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.mtime.getTime() > MAX_AGE_MS) {
        fs.unlinkSync(filePath);
        deletedCount++;
        console.log(`Deleted old cache file: ${file}`);
      }
    });

    console.log(`Cache cleanup completed. Deleted ${deletedCount} files.`);
  } catch (error) {
    console.error('Error during cache cleanup:', error);
  }
}

// Run cleanup
cleanupCache();
