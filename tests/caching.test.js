const { handler } = require('../netlify/functions/ask');

// Mock Redis caching behavior
const mockRedisClient = {
  connect: jest.fn(),
  get: jest.fn(),
  setEx: jest.fn(),
  on: jest.fn()
};

jest.mock('redis', () => ({
  createClient: jest.fn(() => mockRedisClient)
}));

jest.mock('rate-limiter-flexible', () => ({
  RateLimiterRedis: jest.fn(() => ({
    consume: jest.fn(() => Promise.resolve({ 
      remainingPoints: 99, 
      msBeforeNext: 0 
    }))
  }))
}));

describe('ask.js Caching', () => {
  const mockContext = { awsRequestId: 'test-request-id' };
  
  const createMockEvent = (glossaryContent = 'test content', additionalContext = '') => ({
    httpMethod: 'POST',
    body: JSON.stringify({ glossaryContent, additionalContext }),
    headers: { 'x-forwarded-for': '127.0.0.1' },
    requestContext: { identity: { sourceIp: '127.0.0.1' } }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should cache processed data on first request', async () => {
    mockRedisClient.get.mockResolvedValue(null); // Cache miss
    
    const event = createMockEvent('unique content for caching');
    const response = await handler(event, mockContext);
    
    expect(response.statusCode).toBe(200);
    expect(mockRedisClient.get).toHaveBeenCalled();
    expect(mockRedisClient.setEx).toHaveBeenCalled();
    
    const body = JSON.parse(response.body);
    expect(body.fromCache).toBeUndefined(); // Not from cache
  });

  test('should serve from cache on subsequent requests', async () => {
    const cachedData = {
      summary: 'Cached processed content',
      timestamp: '2025-01-15T10:00:00.000Z',
      context: '',
      wordCount: 3,
      processingTimeMs: 1
    };
    
    mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedData));
    
    const event = createMockEvent('cached content');
    const response = await handler(event, mockContext);
    
    expect(response.statusCode).toBe(200);
    expect(mockRedisClient.get).toHaveBeenCalled();
    expect(mockRedisClient.setEx).not.toHaveBeenCalled();
    
    const body = JSON.parse(response.body);
    expect(body.fromCache).toBe(true);
    expect(body.summary).toBe('Cached processed content');
  });

  test('should generate different cache keys for different content', async () => {
    mockRedisClient.get.mockResolvedValue(null);
    
    // First request
    let event = createMockEvent('content A');
    await handler(event, mockContext);
    const firstCacheKey = mockRedisClient.get.mock.calls[0][0];
    
    jest.clearAllMocks();
    mockRedisClient.get.mockResolvedValue(null);
    
    // Second request with different content
    event = createMockEvent('content B');
    await handler(event, mockContext);
    const secondCacheKey = mockRedisClient.get.mock.calls[0][0];
    
    expect(firstCacheKey).not.toBe(secondCacheKey);
  });

  test('should handle cache errors gracefully', async () => {
    mockRedisClient.get.mockRejectedValue(new Error('Redis connection error'));
    
    const event = createMockEvent('content with cache error');
    const response = await handler(event, mockContext);
    
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.summary).toContain('Processed');
    expect(body.fromCache).toBeUndefined();
  });
});