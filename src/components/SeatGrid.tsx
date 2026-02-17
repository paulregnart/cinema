'use client';

import { Seat } from '@/lib/types';
import { getSeatPositionInRow } from '@/lib/validation';

interface SeatGridProps {
  seats: Seat[];
  selectedSeatIds: string[];
  sessionId: string;
  onSeatClick: (seat: Seat) => void;
  disabled?: boolean;
}

const ROW_LABELS = ['A', 'B', 'C', 'D'];

export default function SeatGrid({
  seats,
  selectedSeatIds,
  sessionId,
  onSeatClick,
  disabled = false,
}: SeatGridProps) {
  const getSeatStyle = (seat: Seat) => {
    const isSelected = selectedSeatIds.includes(seat.id);
    const isHeldByMe = seat.status === 'held' && seat.held_by_session === sessionId;
    const isHeldByOther = seat.status === 'held' && seat.held_by_session !== sessionId;
    const isBooked = seat.status === 'booked';

    if (isBooked) {
      return {
        bg: 'bg-red-800',
        text: 'text-red-200',
        border: 'border-red-900',
        cursor: 'cursor-not-allowed',
        label: 'Booked',
        clickable: false,
      };
    }

    if (isHeldByOther) {
      return {
        bg: 'bg-amber-500',
        text: 'text-amber-900',
        border: 'border-amber-600',
        cursor: 'cursor-not-allowed',
        label: 'Held',
        clickable: false,
      };
    }

    if (isSelected || isHeldByMe) {
      return {
        bg: 'bg-blue-600',
        text: 'text-white',
        border: 'border-blue-700',
        cursor: 'cursor-pointer',
        label: 'Your seat',
        clickable: true,
      };
    }

    return {
      bg: 'bg-gray-200 hover:bg-gray-300',
      text: 'text-gray-700',
      border: 'border-gray-300',
      cursor: 'cursor-pointer',
      label: 'Available',
      clickable: true,
    };
  };

  // Group seats by row
  const seatsByRow: Record<string, Seat[]> = {};
  for (const seat of seats) {
    if (!seatsByRow[seat.row_label]) {
      seatsByRow[seat.row_label] = [];
    }
    seatsByRow[seat.row_label].push(seat);
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Screen indicator */}
      <div className="mb-8">
        <div className="w-3/4 mx-auto h-2 bg-gray-400 rounded-t-full" />
        <p className="text-center text-xs text-gray-500 mt-1 uppercase tracking-widest">
          Screen
        </p>
      </div>

      {/* Seat grid */}
      <div className="space-y-3">
        {ROW_LABELS.map((row) => {
          const rowSeats = (seatsByRow[row] || []).sort(
            (a, b) => a.seat_number - b.seat_number
          );
          return (
            <div key={row} className="flex items-center gap-2">
              <span className="w-6 text-center text-sm font-bold text-gray-500">
                {row}
              </span>
              <div className="flex-1 grid grid-cols-5 gap-2">
                {rowSeats.map((seat) => {
                  const style = getSeatStyle(seat);
                  const pos = getSeatPositionInRow(seat.seat_number);
                  return (
                    <button
                      key={seat.id}
                      onClick={() => {
                        if (style.clickable && !disabled) {
                          onSeatClick(seat);
                        }
                      }}
                      disabled={!style.clickable || disabled}
                      title={`${seat.row_label}${pos} — ${style.label}`}
                      className={`
                        aspect-square rounded-lg border-2 flex items-center justify-center
                        text-sm font-semibold transition-all duration-150
                        ${style.bg} ${style.text} ${style.border} ${style.cursor}
                        ${disabled && style.clickable ? 'opacity-50' : ''}
                        focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1
                      `}
                    >
                      {pos}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-gray-200 border border-gray-300" />
          <span className="text-gray-600">Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-blue-600 border border-blue-700" />
          <span className="text-gray-600">Your selection</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-amber-500 border border-amber-600" />
          <span className="text-gray-600">Held</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-red-800 border border-red-900" />
          <span className="text-gray-600">Booked</span>
        </div>
      </div>
    </div>
  );
}
