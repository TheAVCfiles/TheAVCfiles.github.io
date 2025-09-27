const { RateLimiterRedis } = require('rate-limiter-flexible');
const { createClient } = require('redis');
const crypto = require('crypto');

// Redis client singleton
let redisClient = null;
let rateLimiter = null;

/**
 * Initialize Redis client and rate limiter
 */
async function initializeRedis() {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error('REDIS_URL environment variable is required');
    }

    redisClient = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 5000,
        lazyConnect: true
      }
    });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    await redisClient.connect();
    console.log('Redis client connected successfully');
  }

  if (!rateLimiter) {
    const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000; // 1 minute
    const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;

    rateLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'rate_limit_ask',
      points: maxRequests, // Number of requests
      duration: Math.floor(windowMs / 1000), // Per duration in seconds
      blockDuration: 60, // Block for 60 seconds if limit exceeded
    });
    console.log(`Rate limiter initialized: ${maxRequests} requests per ${windowMs}ms`);
  }

  return { redisClient, rateLimiter };
}

/**
 * Generate a cache key for glossary context
 */
function generateCacheKey(glossary, extraContext) {
  const combined = JSON.stringify({ glossary, extraContext });
  return `glossary_context:${crypto.createHash('sha256').update(combined).digest('hex')}`;
}

/**
 * Get cached glossary context
 */
async function getCachedContext(cacheKey) {
  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      console.log(`Cache HIT for key: ${cacheKey.substring(0, 20)}...`);
      return JSON.parse(cached);
    }
    console.log(`Cache MISS for key: ${cacheKey.substring(0, 20)}...`);
    return null;
  } catch (error) {
    console.error('Error getting cached context:', error);
    return null;
  }
}

/**
 * Cache glossary context
 */
async function setCachedContext(cacheKey, context) {
  try {
    const ttl = parseInt(process.env.CACHE_TTL_SECONDS) || 3600; // 1 hour default
    await redisClient.setEx(cacheKey, ttl, JSON.stringify(context));
    console.log(`Context cached for ${ttl} seconds with key: ${cacheKey.substring(0, 20)}...`);
  } catch (error) {
    console.error('Error caching context:', error);
  }
}

/**
 * Process glossary context (placeholder implementation)
 * In a real implementation, this would process the glossary and extraContext
 */
function processGlossaryContext(glossary, extraContext) {
  // Simulate processing time
  const startTime = Date.now();
  
  // Mock processing - in real implementation this would:
  // - Parse glossary entries
  // - Apply extra context
  // - Generate embeddings or other AI processing
  const processedContext = {
    glossaryEntries: Array.isArray(glossary) ? glossary.length : 0,
    extraContextLength: extraContext ? extraContext.length : 0,
    processedAt: new Date().toISOString(),
    processingTimeMs: Date.now() - startTime,
    // Mock processed data
    contextSummary: 'Processed glossary with enhanced context',
    relevantTerms: ['example', 'term', 'processing']
  };

  return processedContext;
}

/**
 * Get client identifier for rate limiting
 */
function getClientIdentifier(event) {
  // Try to get IP from various headers (Netlify/CloudFlare/etc)
  const forwarded = event.headers['x-forwarded-for'];
  const realIp = event.headers['x-real-ip'];
  const clientIp = forwarded ? forwarded.split(',')[0] : realIp;
  
  return clientIp || event.headers['x-netlify-request-id'] || 'unknown';
}

/**
 * Main Netlify function handler
 */
exports.handler = async (event, _context) => {
  const startTime = Date.now();
  
  try {
    // Handle only POST requests (before Redis initialization)
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    // Parse request body (before Redis initialization)
    let requestBody;
    try {
      requestBody = JSON.parse(event.body);
    } catch (error) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      };
    }

    const { question, glossary, extraContext } = requestBody;

    // Validate required fields (before Redis initialization)
    if (!question) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Question is required' })
      };
    }

    // Initialize Redis connection only after basic validation
    await initializeRedis();

    // Get client identifier for rate limiting
    const clientId = getClientIdentifier(event);
    
    // Apply rate limiting
    try {
      await rateLimiter.consume(clientId);
    } catch (rateLimitError) {
      console.log(`Rate limit exceeded for client: ${clientId}`);
      return {
        statusCode: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': Math.round(rateLimitError.msBeforeNext / 1000),
        },
        body: JSON.stringify({
          error: 'Rate limit exceeded',
          retryAfter: Math.round(rateLimitError.msBeforeNext / 1000),
          clientId: clientId.substring(0, 8) + '...' // Partial ID for logging
        })
      };
    }

    // Generate cache key for glossary context
    const cacheKey = generateCacheKey(glossary, extraContext);
    
    // Try to get cached context
    let processedContext = await getCachedContext(cacheKey);
    let cacheHit = !!processedContext;
    
    // If not cached, process and cache the context
    if (!processedContext) {
      processedContext = processGlossaryContext(glossary, extraContext);
      await setCachedContext(cacheKey, processedContext);
    }

    // Simulate AI processing of the question with context
    // In a real implementation, this would call an AI service
    const response = {
      answer: `Based on the glossary context and your question "${question}", here's a response. This is a mock implementation.`,
      contextUsed: processedContext,
      metadata: {
        questionLength: question.length,
        cacheHit,
        processingTimeMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        clientId: clientId.substring(0, 8) + '...'
      }
    };

    console.log(`Request processed successfully - Cache: ${cacheHit ? 'HIT' : 'MISS'}, Time: ${Date.now() - startTime}ms`);

    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache' // Don't cache the response since questions are unique
      },
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('Error in ask function:', error);
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};