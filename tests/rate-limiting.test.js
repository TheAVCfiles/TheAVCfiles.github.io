const { handler } = require('../netlify/functions/ask');

// Mock rate limiting behavior
jest.mock('rate-limiter-flexible', () => ({
  RateLimiterRedis: jest.fn(() => ({
    consume: jest.fn()
      .mockResolvedValueOnce({ remainingPoints: 99, msBeforeNext: 0 })
      .mockResolvedValueOnce({ remainingPoints: 98, msBeforeNext: 0 })
      .mockRejectedValueOnce({ remainingPoints: 0, msBeforeNext: 30000 })
  }))
}));

describe('ask.js Rate Limiting', () => {
  const mockContext = { awsRequestId: 'test-request-id' };
  
  const createMockEvent = (body = null) => ({
    httpMethod: 'POST',
    body: JSON.stringify(body || { glossaryContent: 'test content' }),
    headers: { 'x-forwarded-for': '127.0.0.1' },
    requestContext: { identity: { sourceIp: '127.0.0.1' } }
  });

  test('should handle rate limit exceeded', async () => {
    // First two requests should pass
    let event = createMockEvent();
    let response = await handler(event, mockContext);
    expect(response.statusCode).toBe(200);
    
    event = createMockEvent();
    response = await handler(event, mockContext);
    expect(response.statusCode).toBe(200);
    
    // Third request should be rate limited
    event = createMockEvent();
    response = await handler(event, mockContext);
    expect(response.statusCode).toBe(429);
    
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Rate limit exceeded');
    expect(body.retryAfterMs).toBe(30000);
    expect(response.headers['Retry-After']).toBe('30');
  });
});