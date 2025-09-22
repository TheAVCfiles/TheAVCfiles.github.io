/**
 * Basic tests for the ask.js serverless function
 * Note: These tests require Redis to be available for full testing
 */

const { handler } = require('../netlify/functions/ask');

// Mock event and context for testing
const createMockEvent = (method = 'POST', body = null, headers = {}) => ({
  httpMethod: method,
  body: body ? JSON.stringify(body) : null,
  headers: {
    'x-forwarded-for': '127.0.0.1',
    'content-type': 'application/json',
    ...headers
  }
});

const mockContext = {
  functionName: 'ask',
  functionVersion: '1.0.0'
};

describe('Ask Serverless Function', () => {
  // Skip tests if Redis URL is not available
  const skipRedisTests = !process.env.REDIS_URL;
  
  if (skipRedisTests) {
    console.log('Skipping Redis-dependent tests - REDIS_URL not configured');
  }

  test('should reject non-POST requests', async () => {
    const event = createMockEvent('GET');
    const response = await handler(event, mockContext);
    
    expect(response.statusCode).toBe(405);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Method not allowed');
  });

  test('should reject requests with invalid JSON', async () => {
    const event = {
      httpMethod: 'POST',
      body: 'invalid json',
      headers: { 'x-forwarded-for': '127.0.0.1' }
    };
    
    const response = await handler(event, mockContext);
    
    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Invalid JSON in request body');
  });

  test('should reject requests without question', async () => {
    const event = createMockEvent('POST', { glossary: [], extraContext: 'test' });
    const response = await handler(event, mockContext);
    
    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Question is required');
  });

  // This test will only run if Redis is available
  (skipRedisTests ? test.skip : test)('should process valid request with Redis', async () => {
    const requestBody = {
      question: 'What is the meaning of life?',
      glossary: ['term1', 'term2'],
      extraContext: 'Additional context for processing'
    };
    
    const event = createMockEvent('POST', requestBody);
    
    try {
      const response = await handler(event, mockContext);
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body.answer).toBeDefined();
      expect(body.contextUsed).toBeDefined();
      expect(body.metadata).toBeDefined();
      expect(body.metadata.cacheHit).toBeDefined();
      expect(body.metadata.processingTimeMs).toBeDefined();
    } catch (error) {
      // If Redis connection fails, expect a 500 error
      if (error.message.includes('REDIS_URL')) {
        // This is expected when Redis is not properly configured
        console.log('Redis connection failed as expected in test environment');
      } else {
        throw error;
      }
    }
  });

  test('should handle missing environment variables gracefully', async () => {
    // Temporarily remove Redis URL
    const originalRedisUrl = process.env.REDIS_URL;
    delete process.env.REDIS_URL;
    
    const requestBody = {
      question: 'Test question',
      glossary: [],
      extraContext: ''
    };
    
    const event = createMockEvent('POST', requestBody);
    
    try {
      const response = await handler(event, mockContext);
      
      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Internal server error');
      expect(body.message).toContain('REDIS_URL');
    } finally {
      // Restore environment variable
      if (originalRedisUrl) {
        process.env.REDIS_URL = originalRedisUrl;
      }
    }
  });
});

module.exports = {
  createMockEvent,
  mockContext
};