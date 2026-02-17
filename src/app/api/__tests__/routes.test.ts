/**
 * API Route Tests
 * 
 * Note: These tests require Next.js edge runtime APIs (Request, NextResponse).
 * They are skipped in the standard Jest environment.
 * For full API testing, consider using integration tests with a test server.
 */

import { POST } from '@/app/api/hold/route';
import { POST as bookPost } from '@/app/api/book/route';
import { POST as releasePost } from '@/app/api/release/route';
import { GET } from '@/app/api/screening/route';

// Mock the Supabase module
jest.mock('@/lib/supabase', () => ({
  getServiceSupabase: jest.fn(() => ({
    from: jest.fn((table) => {
      if (table === 'screenings') {
        return {
          select: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'test-screening',
                    film_name: 'Test Film',
                    screening_date: '2026-03-01',
                    screening_time: '19:30:00',
                    created_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              })),
            })),
          })),
        };
      }
      if (table === 'seats') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            })),
          })),
        };
      }
      return {};
    }),
    rpc: jest.fn((funcName) => {
      if (funcName === 'release_expired_holds') {
        return Promise.resolve({ data: null, error: null });
      }
      if (funcName === 'hold_seats') {
        return Promise.resolve({
          data: { success: true },
          error: null,
        });
      }
      if (funcName === 'book_seats') {
        return Promise.resolve({
          data: { success: true, bookingId: 'test-booking-id' },
          error: null,
        });
      }
      if (funcName === 'release_held_seats') {
        return Promise.resolve({
          data: { success: true, released: 2 },
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    }),
  })),
}));

describe.skip('API Routes', () => {
  describe('POST /api/hold', () => {
    it('returns error when request body is invalid', async () => {
      const request = new Request('http://localhost:3000/api/hold', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
    });

    it('returns error when required fields are missing', async () => {
      const request = new Request('http://localhost:3000/api/hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toContain('Missing required fields');
    });

    it('returns error when seat count is invalid', async () => {
      const request = new Request('http://localhost:3000/api/hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seatIds: ['1', '2', '3', '4', '5', '6'], // 6 seats (too many)
          sessionId: 'test-session',
          screeningId: 'test-screening',
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
    });

    it('successfully holds seats with valid request', async () => {
      const request = new Request('http://localhost:3000/api/hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seatIds: ['seat-1', 'seat-2'],
          sessionId: 'test-session',
          screeningId: 'test-screening',
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
    });
  });

  describe('POST /api/book', () => {
    it('returns error when required fields are missing', async () => {
      const request = new Request('http://localhost:3000/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seatIds: ['seat-1'],
          sessionId: 'test-session',
        }),
      });

      const response = await bookPost(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
    });

    it('returns error for invalid email', async () => {
      const request = new Request('http://localhost:3000/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seatIds: ['seat-1'],
          sessionId: 'test-session',
          screeningId: 'test-screening',
          customerName: 'John Doe',
          customerEmail: 'invalid-email',
        }),
      });

      const response = await bookPost(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toContain('Invalid email');
    });

    it('successfully books seats with valid request', async () => {
      const request = new Request('http://localhost:3000/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seatIds: ['seat-1', 'seat-2'],
          sessionId: 'test-session',
          screeningId: 'test-screening',
          customerName: 'John Doe',
          customerEmail: 'john@example.com',
        }),
      });

      const response = await bookPost(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.bookingId).toBeDefined();
    });
  });

  describe('POST /api/release', () => {
    it('returns error when sessionId is missing', async () => {
      const request = new Request('http://localhost:3000/api/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await releasePost(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
    });

    it('successfully releases seats', async () => {
      const request = new Request('http://localhost:3000/api/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session',
        }),
      });

      const response = await releasePost(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
    });
  });

  describe('GET /api/screening', () => {
    it('returns screening data', async () => {
      const response = await GET();
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.screening).toBeDefined();
    });
  });
});
