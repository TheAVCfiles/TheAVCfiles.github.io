# Netlify Serverless Functions

This directory contains serverless functions for TheAVCfiles, deployed on Netlify.

## Functions

### ask.js

A serverless function that provides AI-powered question answering with distributed rate limiting and caching.

#### Features

- **Distributed Rate Limiting**: Uses Redis-based rate limiting with `rate-limiter-flexible`
- **Glossary Context Caching**: Caches processed glossary contexts to reduce computation
- **Comprehensive Logging**: Logs cache hits/misses and rate limit violations
- **Environment Configuration**: Configurable via environment variables

#### Environment Variables

Required:
- `REDIS_URL`: Redis connection URL (e.g., `redis://localhost:6379`)

Optional:
- `RATE_LIMIT_WINDOW_MS`: Rate limit window in milliseconds (default: 60000)
- `RATE_LIMIT_MAX_REQUESTS`: Max requests per window (default: 100)
- `CACHE_TTL_SECONDS`: Cache TTL in seconds (default: 3600)

#### API Usage

**Endpoint**: `/.netlify/functions/ask`
**Method**: POST
**Content-Type**: application/json

**Request Body**:
```json
{
  "question": "Your question here",
  "glossary": ["term1", "term2", "term3"],
  "extraContext": "Additional context for processing"
}
```

**Response**:
```json
{
  "answer": "Generated answer based on context",
  "contextUsed": {
    "glossaryEntries": 3,
    "extraContextLength": 35,
    "processedAt": "2025-01-15T12:00:00Z",
    "processingTimeMs": 150
  },
  "metadata": {
    "questionLength": 20,
    "cacheHit": true,
    "processingTimeMs": 45,
    "timestamp": "2025-01-15T12:00:00Z",
    "clientId": "abc123..."
  }
}
```

#### Rate Limiting

- Rate limiting is applied per client IP address
- When rate limit is exceeded, returns HTTP 429 with retry information
- Distributed across serverless function instances using Redis

#### Caching

- Glossary contexts are cached using SHA256 hash of glossary + extraContext
- Cache invalidation happens automatically via TTL
- Cache hits/misses are logged for monitoring

#### Error Responses

**400 Bad Request**: Invalid request format or missing required fields
**405 Method Not Allowed**: Non-POST requests
**429 Too Many Requests**: Rate limit exceeded
**500 Internal Server Error**: Server-side errors (Redis connection, etc.)

## Development

### Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   export REDIS_URL="redis://localhost:6379"
   ```

3. Run locally with Netlify CLI:
   ```bash
   npm run dev
   ```

### Testing

Run tests:
```bash
npm test
```

Note: Some tests require Redis to be available and REDIS_URL environment variable to be set.

### Deployment

Functions are automatically deployed to Netlify when pushed to the main branch.

## Monitoring

The function logs the following for monitoring:

- Cache hits and misses with cache key prefixes
- Rate limit violations with client IDs
- Processing times for performance monitoring
- Redis connection status
- Error conditions with details

Use Netlify's function logs or external log aggregation services to monitor these metrics in production.