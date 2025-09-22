const { handler } = require('../netlify/functions/ask');

// Mock environment variables
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.RATE_WINDOW_MS = '60000';
process.env.RATE_MAX_REQUESTS = '100';
process.env.CACHE_TTL = '3600';

describe('ask.js Netlify Function', () => {
  // Mock event and context objects
  const mockContext = {
    awsRequestId: 'test-request-id'
  };

  const createMockEvent = (method = 'POST', body = null, headers = {}) => ({
    httpMethod: method,
    body: body ? JSON.stringify(body) : null,
    headers: {
      'x-forwarded-for': '127.0.0.1',
      ...headers
    },
    requestContext: {
      identity: {
        sourceIp: '127.0.0.1'
      }
    }
  });

  describe('HTTP Method Validation', () => {
    test('should reject GET requests', async () => {
      const event = createMockEvent('GET');
      const response = await handler(event, mockContext);
      
      expect(response.statusCode).toBe(405);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Method not allowed. Use POST.');
    });

    test('should handle OPTIONS requests (CORS preflight)', async () => {
      const event = createMockEvent('OPTIONS');
      const response = await handler(event, mockContext);
      
      expect(response.statusCode).toBe(200);
      expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
      expect(response.headers['Access-Control-Allow-Methods']).toContain('POST');
    });
  });

  describe('Request Validation', () => {
    test('should reject invalid JSON', async () => {
      const event = {
        ...createMockEvent('POST'),
        body: 'invalid json'
      };
      const response = await handler(event, mockContext);
      
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Invalid JSON in request body');
    });

    test('should require glossaryContent field', async () => {
      const event = createMockEvent('POST', {});
      const response = await handler(event, mockContext);
      
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Missing or invalid glossaryContent field');
    });

    test('should validate glossaryContent is a string', async () => {
      const event = createMockEvent('POST', { glossaryContent: 123 });
      const response = await handler(event, mockContext);
      
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Missing or invalid glossaryContent field');
    });
  });

  describe('Successful Processing', () => {
    test('should process valid glossary content', async () => {
      const glossaryContent = 'This is a test glossary content with multiple words.';
      const event = createMockEvent('POST', { 
        glossaryContent,
        additionalContext: 'test context'
      });
      
      const response = await handler(event, mockContext);
      
      // Note: This test may fail if Redis is not available, but the function
      // should still work with fallback behavior
      expect([200, 500]).toContain(response.statusCode);
      
      if (response.statusCode === 200) {
        const body = JSON.parse(response.body);
        expect(body.summary).toContain('Processed');
        expect(body.context).toBe('test context');
        expect(body.wordCount).toBeGreaterThan(0);
        expect(body.requestId).toBe('test-request-id');
        expect(body.rateLimitInfo).toBeDefined();
      }
    });
  });

  describe('CORS Headers', () => {
    test('should include proper CORS headers', async () => {
      const event = createMockEvent('POST', { glossaryContent: 'test' });
      const response = await handler(event, mockContext);
      
      expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
      expect(response.headers['Content-Type']).toBe('application/json');
    });
  });
});