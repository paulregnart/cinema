import { render, screen, fireEvent } from '@testing-library/react';
import SeatGrid from '../SeatGrid';
import { Seat } from '@/lib/types';

describe('SeatGrid', () => {
  const screeningId = 'test-screening';
  const sessionId = 'test-session';
  const mockOnSeatClick = jest.fn();

  const createMockSeats = (): Seat[] => {
    const rows = ['A', 'B', 'C', 'D'];
    const seats: Seat[] = [];
    
    for (let i = 1; i <= 20; i++) {
      const rowIndex = Math.floor((i - 1) / 5);
      seats.push({
        id: `seat-${i}`,
        screening_id: screeningId,
        seat_number: i,
        row_label: rows[rowIndex],
        status: 'available',
        held_until: null,
        held_by_session: null,
        booked_by_session: null,
        created_at: new Date().toISOString(),
      });
    }
    
    return seats;
  };

  beforeEach(() => {
    mockOnSeatClick.mockClear();
  });

  it('renders all 20 seats', () => {
    const seats = createMockSeats();
    render(
      <SeatGrid
        seats={seats}
        selectedSeatIds={[]}
        sessionId={sessionId}
        onSeatClick={mockOnSeatClick}
      />
    );

    // Check that all seat buttons are rendered
    const seatButtons = screen.getAllByRole('button');
    expect(seatButtons).toHaveLength(20);
  });

  it('displays row labels A, B, C, D', () => {
    const seats = createMockSeats();
    render(
      <SeatGrid
        seats={seats}
        selectedSeatIds={[]}
        sessionId={sessionId}
        onSeatClick={mockOnSeatClick}
      />
    );

    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByText('D')).toBeInTheDocument();
  });

  it('renders screen indicator', () => {
    const seats = createMockSeats();
    render(
      <SeatGrid
        seats={seats}
        selectedSeatIds={[]}
        sessionId={sessionId}
        onSeatClick={mockOnSeatClick}
      />
    );

    expect(screen.getByText(/screen/i)).toBeInTheDocument();
  });

  it('calls onSeatClick when an available seat is clicked', () => {
    const seats = createMockSeats();
    render(
      <SeatGrid
        seats={seats}
        selectedSeatIds={[]}
        sessionId={sessionId}
        onSeatClick={mockOnSeatClick}
      />
    );

    const firstSeat = screen.getAllByRole('button')[0];
    fireEvent.click(firstSeat);

    expect(mockOnSeatClick).toHaveBeenCalledTimes(1);
    expect(mockOnSeatClick).toHaveBeenCalledWith(seats[0]);
  });

  it('does not call onSeatClick for booked seats', () => {
    const seats = createMockSeats();
    seats[0].status = 'booked';
    
    render(
      <SeatGrid
        seats={seats}
        selectedSeatIds={[]}
        sessionId={sessionId}
        onSeatClick={mockOnSeatClick}
      />
    );

    const firstSeat = screen.getAllByRole('button')[0];
    fireEvent.click(firstSeat);

    expect(mockOnSeatClick).not.toHaveBeenCalled();
  });

  it('does not call onSeatClick for seats held by others', () => {
    const seats = createMockSeats();
    seats[0].status = 'held';
    seats[0].held_by_session = 'other-session';
    
    render(
      <SeatGrid
        seats={seats}
        selectedSeatIds={[]}
        sessionId={sessionId}
        onSeatClick={mockOnSeatClick}
      />
    );

    const firstSeat = screen.getAllByRole('button')[0];
    fireEvent.click(firstSeat);

    expect(mockOnSeatClick).not.toHaveBeenCalled();
  });

  it('shows selected seats as clickable', () => {
    const seats = createMockSeats();
    render(
      <SeatGrid
        seats={seats}
        selectedSeatIds={['seat-1', 'seat-2']}
        sessionId={sessionId}
        onSeatClick={mockOnSeatClick}
      />
    );

    const firstSeat = screen.getAllByRole('button')[0];
    fireEvent.click(firstSeat);

    expect(mockOnSeatClick).toHaveBeenCalled();
  });

  it('disables all seats when disabled prop is true', () => {
    const seats = createMockSeats();
    render(
      <SeatGrid
        seats={seats}
        selectedSeatIds={[]}
        sessionId={sessionId}
        onSeatClick={mockOnSeatClick}
        disabled={true}
      />
    );

    const firstSeat = screen.getAllByRole('button')[0];
    fireEvent.click(firstSeat);

    expect(mockOnSeatClick).not.toHaveBeenCalled();
  });

  it('displays legend with all seat states', () => {
    const seats = createMockSeats();
    render(
      <SeatGrid
        seats={seats}
        selectedSeatIds={[]}
        sessionId={sessionId}
        onSeatClick={mockOnSeatClick}
      />
    );

    expect(screen.getByText('Available')).toBeInTheDocument();
    expect(screen.getByText('Your selection')).toBeInTheDocument();
    expect(screen.getByText('Held')).toBeInTheDocument();
    expect(screen.getByText('Booked')).toBeInTheDocument();
  });
});
