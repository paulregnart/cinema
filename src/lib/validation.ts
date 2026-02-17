import { Seat } from './types';

const SEATS_PER_ROW = 5;
const ROWS = ['A', 'B', 'C', 'D'];

/**
 * Get the position within a row (1-5) from a seat number (1-20).
 */
export function getSeatPositionInRow(seatNumber: number): number {
  return ((seatNumber - 1) % SEATS_PER_ROW) + 1;
}

/**
 * Get the row label from a seat number (1-20).
 */
export function getRowFromSeatNumber(seatNumber: number): string {
  const rowIndex = Math.floor((seatNumber - 1) / SEATS_PER_ROW);
  return ROWS[rowIndex];
}

/**
 * Check if a selection would leave an isolated seat.
 * An isolated seat is one that is available but has no available neighbours
 * on either side within the same row.
 *
 * @param seats - All seats for the screening
 * @param selectedSeatIds - The seat IDs the current user wants to hold
 * @param sessionId - Current user's session ID
 * @returns Object with isValid and error message
 */
export function validateNoIsolatedSeats(
  seats: Seat[],
  selectedSeatIds: string[],
  sessionId: string
): { isValid: boolean; error?: string } {
  // Group seats by row
  const seatsByRow: Record<string, Seat[]> = {};
  for (const seat of seats) {
    if (!seatsByRow[seat.row_label]) {
      seatsByRow[seat.row_label] = [];
    }
    seatsByRow[seat.row_label].push(seat);
  }

  for (const row of ROWS) {
    const rowSeats = (seatsByRow[row] || []).sort(
      (a, b) => a.seat_number - b.seat_number
    );

    // Simulate the new state of this row
    const seatStates: { seatNumber: number; available: boolean }[] = rowSeats.map(
      (seat) => {
        const isBeingSelected = selectedSeatIds.includes(seat.id);
        const isHeldByMe =
          seat.status === 'held' && seat.held_by_session === sessionId;

        let available: boolean;
        if (isBeingSelected) {
          // This seat will be held by the user
          available = false;
        } else if (isHeldByMe && !isBeingSelected) {
          // Seat was held by user but is not in new selection — it will be released
          available = true;
        } else if (seat.status === 'available') {
          available = true;
        } else {
          // held by someone else or booked
          available = false;
        }

        return {
          seatNumber: seat.seat_number,
          available,
        };
      }
    );

    // Check for isolated available seats
    for (let i = 0; i < seatStates.length; i++) {
      if (!seatStates[i].available) continue;

      const pos = getSeatPositionInRow(seatStates[i].seatNumber);
      const hasLeftNeighbor =
        i > 0 && seatStates[i - 1].available && getSeatPositionInRow(seatStates[i - 1].seatNumber) === pos - 1;
      const hasRightNeighbor =
        i < seatStates.length - 1 &&
        seatStates[i + 1].available &&
        getSeatPositionInRow(seatStates[i + 1].seatNumber) === pos + 1;

      if (!hasLeftNeighbor && !hasRightNeighbor) {
        // Check if this is the ONLY available seat in the entire row — 
        // if so, it's the last seat and that's fine.
        const availableInRow = seatStates.filter((s) => s.available).length;
        if (availableInRow === 1) {
          // Last seat in the row — allow it
          continue;
        }

        return {
          isValid: false,
          error: `Selection would leave an isolated seat at Row ${row}, Seat ${pos}`,
        };
      }
    }
  }

  return { isValid: true };
}

/**
 * Get a display label for a seat, e.g. "A1", "B3"
 */
export function getSeatLabel(seat: Seat): string {
  const pos = getSeatPositionInRow(seat.seat_number);
  return `${seat.row_label}${pos}`;
}
