import { renderHook, waitFor } from '@testing-library/react';
import { useApi } from './useApi';

// Mock global fetch
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.Mock;

describe('useApi Hook', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('handles ETag and 304 Not Modified correctly', async () => {
    // First call: successful, returns data and ETag
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'ETag': 'etag-123' }),
      json: () => Promise.resolve({ data: 'initial data' }),
    });

    const { result, rerender } = renderHook(() => useApi('/test-url'));

    await waitFor(() => expect(result.current.data).toEqual({ data: 'initial data' }));
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith('/test-url', expect.objectContaining({
      headers: expect.not.objectContaining({ 'If-None-Match': 'etag-123' }),
    }));

    // Second call: simulate 304 Not Modified
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 304,
    });

    result.current.refetch();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch).toHaveBeenCalledWith('/test-url', expect.objectContaining({
      headers: expect.objectContaining({ 'If-None-Match': 'etag-123' }),
    }));
    // Data should remain unchanged
    expect(result.current.data).toEqual({ data: 'initial data' });
  });

  it('retries up to 2 times on 5xx server errors', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 500, json: () => Promise.resolve({ message: 'Server Error' }) })
      .mockResolvedValueOnce({ ok: false, status: 503, json: () => Promise.resolve({ message: 'Service Unavailable' }) })
      .mockResolvedValueOnce({ ok: true, status: 200, headers: new Headers(), json: () => Promise.resolve({ data: 'final data' }) });

    const { result } = renderHook(() => useApi('/retry-url'));

    await waitFor(() => expect(result.current.data).toEqual({ data: 'final data' }));
    expect(mockFetch).toHaveBeenCalledTimes(3); // Initial call + 2 retries
    expect(result.current.error).toBeNull();
  });

  it('fails after max retries on persistent 5xx errors', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ message: 'Persistent Server Error' }),
    });

    const { result } = renderHook(() => useApi('/fail-url'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockFetch).toHaveBeenCalledTimes(3); // Initial call + 2 retries
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Persistent Server Error');
  });
});