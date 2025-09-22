// Jest setup file
// Mock Redis connections for testing
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    get: jest.fn(),
    setEx: jest.fn(),
    on: jest.fn()
  }))
}));

jest.mock('rate-limiter-flexible', () => ({
  RateLimiterRedis: jest.fn(() => ({
    consume: jest.fn(() => Promise.resolve({ 
      remainingPoints: 99, 
      msBeforeNext: 0 
    }))
  }))
}));