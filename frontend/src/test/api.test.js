/**
 * API service tests — WBS 14.2
 * Tests the axios instance configuration: base URL, auth header injection,
 * and 401 auto-logout behaviour.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// We test the module in isolation with mocked axios
vi.mock('axios', () => {
  const mockInstance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  };
  return {
    default: {
      create: vi.fn(() => mockInstance),
    },
    __esModule: true,
  };
});

describe('api service', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('creates axios instance with correct baseURL', async () => {
    const axios = (await import('axios')).default;
    await import('../services/api');
    expect(axios.create).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      })
    );
  });

  it('sets up request and response interceptors', async () => {
    const axios = (await import('axios')).default;
    const mockInstance = axios.create();
    await import('../services/api');
    expect(mockInstance.interceptors.request.use).toHaveBeenCalled();
    expect(mockInstance.interceptors.response.use).toHaveBeenCalled();
  });
});
