# TheAVCfiles.github.io

Automated GitHub Pages deployment with dynamic date handling for JSONL file URLs and distributed serverless functions.

## Features

- 🚀 **Automated Deployment**: Content from `public/` directory deployed to GitHub Pages
- 📅 **Dynamic Date Replacement**: Automatically replaces `YYYY-MM-DD` placeholders with current date
- 🔄 **Daily Updates**: Scheduled workflow runs daily to keep date links current
- 📱 **Mobile-Friendly**: Optimized for file uploads from external devices like iPhones
- ⚡ **Serverless Functions**: Netlify functions with distributed rate-limiting and caching
- 🔒 **Rate Limiting**: Redis-backed distributed rate limiting for API endpoints
- 💾 **Smart Caching**: Redis-based caching for improved performance and scalability

## Serverless Functions

### ask.js Function

The `ask.js` Netlify function provides an API endpoint for processing glossary contexts with advanced features:

#### Features:
- **Distributed Rate Limiting**: Redis-backed rate limiting across serverless instances
- **Smart Caching**: Shared Redis cache for processed glossary contexts
- **Fallback Handling**: Graceful degradation when Redis is unavailable
- **Comprehensive Logging**: Detailed logging for monitoring and debugging

#### Environment Variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `RATE_WINDOW_MS` | Rate limiting time window in milliseconds | `60000` (1 minute) |
| `RATE_MAX_REQUESTS` | Maximum requests per time window | `100` |
| `CACHE_TTL` | Cache time-to-live in seconds | `3600` (1 hour) |

#### Usage Example:

```javascript
// POST to /.netlify/functions/ask or /api/ask
const response = await fetch('/api/ask', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    glossaryContent: 'Your glossary content here...',
    additionalContext: 'Optional additional context'
  })
});

const result = await response.json();
console.log(result);
```

#### Response Format:

```json
{
  "summary": "Processed content summary",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "context": "Additional context provided",
  "wordCount": 42,
  "processingTimeMs": 5,
  "fromCache": false,
  "requestId": "aws-request-id",
  "rateLimitInfo": {
    "remainingRequests": 99,
    "windowMs": 60000
  }
}
```

## Quick Start

1. **Add Content**: Place your static files in the `public/` directory
2. **Use Date Placeholders**: Use `YYYY-MM-DD` in URLs where you want dynamic dates
3. **Configure Functions**: Set environment variables for Redis and rate limiting
4. **Push to Main**: Changes to the main branch automatically trigger deployment
5. **Access Site**: Visit your GitHub Pages URL to see the deployed site

## Examples

### HTML with Dynamic Date Links
```html
<a href="https://example.com/data/YYYY-MM-DD.jsonl">Today's Data</a>
```

### JavaScript with Date Replacement
```javascript
const dataUrl = 'https://api.example.com/data/YYYY-MM-DD.json';
```

## Documentation

📖 **[Full Documentation](docs/DEPLOYMENT.md)** - Complete guide including:
- Workflow configuration details
- External device file upload/decoding
- Troubleshooting common issues
- Security considerations
- Testing and validation procedures

## Architecture

- **Source**: `public/` directory contains all static files
- **Processing**: GitHub Actions workflow replaces date placeholders during build
- **Deployment**: Processed files deployed to GitHub Pages automatically
- **Scheduling**: Daily runs ensure date links stay current

## Contributing

1. Fork the repository
2. Make changes to files in the `public/` directory
3. Test locally if needed
4. Create a pull request to the main branch

## License

MIT License - see [LICENSE](LICENSE) file for details.