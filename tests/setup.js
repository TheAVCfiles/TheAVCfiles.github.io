// Jest setup file
// Set default environment variables for testing

process.env.RATE_LIMIT_WINDOW_MS = '60000';
process.env.RATE_LIMIT_MAX_REQUESTS = '100';
process.env.CACHE_TTL_SECONDS = '3600';

// Only set Redis URL if not already set by environment
if (!process.env.REDIS_URL) {
  // In CI/testing, we might not have Redis available
  // The tests are designed to handle this gracefully
  console.log('Redis URL not configured - some tests will be skipped');
}