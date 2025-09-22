/**
 * Netlify Serverless Function: ask.js
 * 
 * Provides an API endpoint for processing glossary contexts with distributed 
 * rate-limiting and caching using Redis.
 * 
 * Environment Variables Required:
 * - REDIS_URL: Redis connection URL (e.g., redis://localhost:6379)
 * - RATE_WINDOW_MS: Rate limiting time window in milliseconds (default: 60000)
 * - RATE_MAX_REQUESTS: Maximum requests per window (default: 100)
 * - CACHE_TTL: Cache time-to-live in seconds (default: 3600)
 * 
 * Features:
 * - Redis-backed distributed rate limiting
 * - Shared caching for processed glossary contexts
 * - Fallback error handling for Redis connectivity
 * - Comprehensive logging for monitoring
 */

const { RateLimiterRedis } = require('rate-limiter-flexible');
const { createClient } = require('redis');
const crypto = require('crypto');

// Configuration from environment variables
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const RATE_WINDOW_MS = parseInt(process.env.RATE_WINDOW_MS || '60000', 10);
const RATE_MAX_REQUESTS = parseInt(process.env.RATE_MAX_REQUESTS || '100', 10);
const CACHE_TTL = parseInt(process.env.CACHE_TTL || '3600', 10);

// Global variables for Redis connections (reused across function invocations)
let redisClient = null;
let rateLimiter = null;

/**
 * Initialize Redis client and rate limiter
 */
async function initializeRedis() {
  if (!redisClient) {
    try {
      redisClient = createClient({
        url: REDIS_URL,
        socket: {
          connectTimeout: 5000,
          lazyConnect: true
        }
      });

      redisClient.on('error', (err) => {
        console.error('Redis Client Error:', err);
      });

      redisClient.on('connect', () => {
        console.log('Redis Client Connected');
      });

      await redisClient.connect();
      console.log('Redis client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Redis client:', error);
      redisClient = null;
      throw error;
    }
  }

  if (!rateLimiter && redisClient) {
    try {
      rateLimiter = new RateLimiterRedis({
        storeClient: redisClient,
        keyPrefix: 'ask_function_rl',
        points: RATE_MAX_REQUESTS,
        duration: Math.floor(RATE_WINDOW_MS / 1000), // Convert to seconds
        blockDuration: Math.floor(RATE_WINDOW_MS / 1000), // Block for the same duration
      });
      console.log(`Rate limiter initialized: ${RATE_MAX_REQUESTS} requests per ${RATE_WINDOW_MS}ms`);
    } catch (error) {
      console.error('Failed to initialize rate limiter:', error);
      rateLimiter = null;
      throw error;
    }
  }
}

/**
 * Generate cache key based on glossary content and context
 */
function generateCacheKey(glossaryContent, additionalContext = '') {
  const content = JSON.stringify({ glossaryContent, additionalContext });
  return `glossary_cache:${crypto.createHash('sha256').update(content).digest('hex')}`;
}

/**
 * Get processed data from cache
 */
async function getFromCache(cacheKey) {
  if (!redisClient) {
    console.warn('Redis client not available, skipping cache read');
    return null;
  }

  try {
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      console.log(`Cache hit for key: ${cacheKey}`);
      return JSON.parse(cachedData);
    }
    console.log(`Cache miss for key: ${cacheKey}`);
    return null;
  } catch (error) {
    console.error('Error reading from cache:', error);
    return null;
  }
}

/**
 * Store processed data in cache
 */
async function setCache(cacheKey, data) {
  if (!redisClient) {
    console.warn('Redis client not available, skipping cache write');
    return;
  }

  try {
    await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(data));
    console.log(`Data cached with key: ${cacheKey}, TTL: ${CACHE_TTL}s`);
  } catch (error) {
    console.error('Error writing to cache:', error);
  }
}

/**
 * Process glossary content (placeholder implementation)
 * In a real application, this would contain the actual business logic
 */
function processGlossaryContent(glossaryContent, additionalContext) {
  // Simulate processing time
  const startTime = Date.now();
  
  // Mock processing logic - replace with actual implementation
  const processedData = {
    summary: `Processed ${glossaryContent.length} characters of glossary content`,
    timestamp: new Date().toISOString(),
    context: additionalContext,
    wordCount: glossaryContent.split(/\s+/).length,
    processingTimeMs: Date.now() - startTime
  };

  console.log(`Processed glossary content in ${processedData.processingTimeMs}ms`);
  return processedData;
}

/**
 * Check rate limiting for the request
 */
async function checkRateLimit(clientIP) {
  if (!rateLimiter) {
    console.warn('Rate limiter not available, allowing request');
    return { allowed: true };
  }

  try {
    const result = await rateLimiter.consume(clientIP);
    console.log(`Rate limit check passed for ${clientIP}. Remaining: ${result.remainingPoints}`);
    return {
      allowed: true,
      remainingPoints: result.remainingPoints,
      msBeforeNext: result.msBeforeNext
    };
  } catch (rejRes) {
    console.warn(`Rate limit exceeded for ${clientIP}. Retry after: ${rejRes.msBeforeNext}ms`);
    return {
      allowed: false,
      retryAfterMs: rejRes.msBeforeNext,
      remainingPoints: 0
    };
  }
}

/**
 * Main handler function
 */
exports.handler = async (event, context) => {
  const startTime = Date.now();
  
  // Extract client IP for rate limiting
  const clientIP = event.headers['x-forwarded-for'] || 
                   event.headers['x-real-ip'] || 
                   event.requestContext?.identity?.sourceIp || 
                   'unknown';

  console.log(`Request from ${clientIP} - Method: ${event.httpMethod}`);

  try {
    // Handle preflight requests first
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        body: ''
      };
    }

    // Only handle POST requests
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        body: JSON.stringify({ error: 'Method not allowed. Use POST.' })
      };
    }

    // Initialize Redis connections
    await initializeRedis();

    // Check rate limiting
    const rateLimitResult = await checkRateLimit(clientIP);
    if (!rateLimitResult.allowed) {
      return {
        statusCode: 429,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Retry-After': Math.ceil(rateLimitResult.retryAfterMs / 1000).toString()
        },
        body: JSON.stringify({
          error: 'Rate limit exceeded',
          retryAfterMs: rateLimitResult.retryAfterMs
        })
      };
    }

    // Parse request body
    let requestBody;
    try {
      requestBody = JSON.parse(event.body || '{}');
    } catch (error) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      };
    }

    // Validate required fields
    const { glossaryContent, additionalContext = '' } = requestBody;
    if (!glossaryContent || typeof glossaryContent !== 'string') {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          error: 'Missing or invalid glossaryContent field' 
        })
      };
    }

    // Generate cache key
    const cacheKey = generateCacheKey(glossaryContent, additionalContext);

    // Try to get from cache first
    let processedData = await getFromCache(cacheKey);

    if (!processedData) {
      // Process the glossary content
      processedData = processGlossaryContent(glossaryContent, additionalContext);
      
      // Cache the result
      await setCache(cacheKey, processedData);
    } else {
      console.log('Serving from cache');
      processedData.fromCache = true;
    }

    // Add metadata to response
    const responseData = {
      ...processedData,
      requestId: context.awsRequestId,
      processingTimeMs: Date.now() - startTime,
      rateLimitInfo: {
        remainingRequests: rateLimitResult.remainingPoints,
        windowMs: RATE_WINDOW_MS
      }
    };

    console.log(`Request completed in ${responseData.processingTimeMs}ms`);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'X-RateLimit-Remaining': rateLimitResult.remainingPoints?.toString() || '0',
        'X-RateLimit-Reset': Math.ceil((Date.now() + RATE_WINDOW_MS) / 1000).toString()
      },
      body: JSON.stringify(responseData)
    };

  } catch (error) {
    console.error('Function error:', error);

    // Log detailed error information
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      clientIP,
      requestMethod: event.httpMethod,
      processingTimeMs: Date.now() - startTime
    });

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Internal server error',
        requestId: context.awsRequestId
      })
    };
  }
};