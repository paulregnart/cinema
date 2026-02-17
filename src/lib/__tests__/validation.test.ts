import { validateNoIsolatedSeats, getSeatLabel, getSeatPositionInRow, getRowFromSeatNumber } from '../validation';
import { Seat } from '../types';

describe('Validation utilities', () => {
  describe('getSeatPositionInRow', () => {
    it('should return correct position for seat number 1', () => {
      expect(getSeatPositionInRow(1)).toBe(1);
    });

    it('should return correct position for seat number 5', () => {
      expect(getSeatPositionInRow(5)).toBe(5);
    });

    it('should return correct position for seat number 6 (first seat in row B)', () => {
      expect(getSeatPositionInRow(6)).toBe(1);
    });

    it('should return correct position for seat number 20 (last seat)', () => {
      expect(getSeatPositionInRow(20)).toBe(5);
    });
  });

  describe('getRowFromSeatNumber', () => {
    it('should return A for seats 1-5', () => {
      expect(getRowFromSeatNumber(1)).toBe('A');
      expect(getRowFromSeatNumber(5)).toBe('A');
    });

    it('should return B for seats 6-10', () => {
      expect(getRowFromSeatNumber(6)).toBe('B');
      expect(getRowFromSeatNumber(10)).toBe('B');
    });

    it('should return C for seats 11-15', () => {
      expect(getRowFromSeatNumber(11)).toBe('C');
      expect(getRowFromSeatNumber(15)).toBe('C');
    });

    it('should return D for seats 16-20', () => {
      expect(getRowFromSeatNumber(16)).toBe('D');
      expect(getRowFromSeatNumber(20)).toBe('D');
    });
  });

  describe('getSeatLabel', () => {
    const mockSeat: Seat = {
      id: '123',
      screening_id: '456',
      seat_number: 1,
      row_label: 'A',
      status: 'available',
      held_until: null,
      held_by_session: null,
      booked_by_session: null,
      created_at: new Date().toISOString(),
    };

    it('should return A1 for seat 1', () => {
      expect(getSeatLabel({ ...mockSeat, seat_number: 1, row_label: 'A' })).toBe('A1');
    });

    it('should return B3 for seat 8', () => {
      expect(getSeatLabel({ ...mockSeat, seat_number: 8, row_label: 'B' })).toBe('B3');
    });

    it('should return D5 for seat 20', () => {
      expect(getSeatLabel({ ...mockSeat, seat_number: 20, row_label: 'D' })).toBe('D5');
    });
  });

  describe('validateNoIsolatedSeats', () => {
    const screeningId = 'test-screening';
    const sessionId = 'test-session';

    // Helper to create a full set of 20 seats
    const createSeats = (overrides: Partial<Seat>[] = []): Seat[] => {
      const rows = ['A', 'B', 'C', 'D'];
      const seats: Seat[] = [];
      
      for (let i = 1; i <= 20; i++) {
        const rowIndex = Math.floor((i - 1) / 5);
        const seat: Seat = {
          id: `seat-${i}`,
          screening_id: screeningId,
          seat_number: i,
          row_label: rows[rowIndex],
          status: 'available',
          held_until: null,
          held_by_session: null,
          booked_by_session: null,
          created_at: new Date().toISOString(),
          ...overrides.find(o => o.seat_number === i),
        };
        seats.push(seat);
      }
      
      return seats;
    };

    it('should allow selecting seats that do not create isolated seats', () => {
      const seats = createSeats();
      // Select seats 1 and 2 (A1, A2) - no isolation
      const result = validateNoIsolatedSeats(seats, ['seat-1', 'seat-2'], sessionId);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject selecting seats that leave isolated seats (but allow if last seat)', () => {
      const seats = createSeats();
      // Select seats 6, 8 (B1, B3) - leaves B2 isolated with other seats still available
      const result = validateNoIsolatedSeats(
        seats,
        ['seat-6', 'seat-8'],
        sessionId
      );
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('isolated seat');
    });

    it('should allow selecting all seats in a row except one if sides are occupied', () => {
      // Book seats 1, 2, 4, 5 in row A
      const seats = createSeats([
        { seat_number: 1, status: 'booked' },
        { seat_number: 2, status: 'booked' },
        { seat_number: 4, status: 'booked' },
        { seat_number: 5, status: 'booked' },
      ]);
      
      // Seat 3 is alone but it's the last available seat in the row
      const result = validateNoIsolatedSeats(seats, [], sessionId);
      expect(result.isValid).toBe(true);
    });

    it('should handle seats held by the current session', () => {
      const seats = createSeats([
        { seat_number: 1, status: 'held', held_by_session: sessionId },
        { seat_number: 2, status: 'held', held_by_session: sessionId },
      ]);
      
      // User changes selection to seats 1, 3 (releases 2, selects 3)
      // This would leave seat 2 isolated
      const result = validateNoIsolatedSeats(seats, ['seat-1', 'seat-3'], sessionId);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('isolated seat');
    });

    it('should allow the last available seat in a row', () => {
      // All seats booked except one
      const seats = createSeats([
        { seat_number: 1, status: 'booked' },
        { seat_number: 2, status: 'booked' },
        { seat_number: 3, status: 'booked' },
        { seat_number: 4, status: 'booked' },
        // seat 5 is available
      ]);
      
      // Selecting nothing (checking current state) - seat 5 is alone but it's the last one
      const result = validateNoIsolatedSeats(seats, [], sessionId);
      expect(result.isValid).toBe(true);
    });

    it('should handle multiple rows independently', () => {
      const seats = createSeats([
        { seat_number: 1, status: 'booked' },
        { seat_number: 3, status: 'booked' },
        { seat_number: 5, status: 'booked' },
        // Row A: seat 2 and 4 are available and isolated
      ]);
      
      // Try to book seat 6 (B1) - should fail because row A has isolated seats
      const result = validateNoIsolatedSeats(seats, ['seat-6'], sessionId);
      expect(result.isValid).toBe(false);
    });

    it('should allow contiguous seat selection', () => {
      const seats = createSeats();
      // Select seats 6, 7, 8 (B1, B2, B3) - all contiguous
      const result = validateNoIsolatedSeats(
        seats,
        ['seat-6', 'seat-7', 'seat-8'],
        sessionId
      );
      expect(result.isValid).toBe(true);
    });

    it('should reject non-contiguous selection that creates isolation', () => {
      const seats = createSeats();
      // Select seats 6, 8 (B1, B3) - leaves B2 isolated
      const result = validateNoIsolatedSeats(seats, ['seat-6', 'seat-8'], sessionId);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('isolated seat');
    });
  });
});
