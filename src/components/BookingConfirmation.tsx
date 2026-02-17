'use client';

import { Seat } from '@/lib/types';
import { getSeatLabel } from '@/lib/validation';

interface BookingConfirmationProps {
  bookingId: string;
  customerName: string;
  seats: Seat[];
  filmName: string;
  screeningDate: string;
  screeningTime: string;
  onNewBooking: () => void;
}

export default function BookingConfirmation({
  bookingId,
  customerName,
  seats,
  filmName,
  screeningDate,
  screeningTime,
  onNewBooking,
}: BookingConfirmationProps) {
  return (
    <div className="text-center space-y-6">
      <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
        <svg
          className="w-8 h-8 text-green-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-900">Booking Confirmed!</h2>
        <p className="text-gray-500 mt-1">Thank you, {customerName}</p>
      </div>

      <div className="bg-gray-50 rounded-xl p-6 text-left space-y-3">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">Film</p>
          <p className="font-semibold text-gray-900">{filmName}</p>
        </div>
        <div className="flex gap-6">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Date</p>
            <p className="font-semibold text-gray-900">
              {new Date(screeningDate).toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Time</p>
            <p className="font-semibold text-gray-900">{screeningTime.slice(0, 5)}</p>
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">Seats</p>
          <div className="flex gap-2 mt-1 flex-wrap">
            {seats.map((seat) => (
              <span
                key={seat.id}
                className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-md text-sm font-semibold"
              >
                {getSeatLabel(seat)}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">Booking Reference</p>
          <p className="font-mono text-sm text-gray-700">{bookingId.slice(0, 8).toUpperCase()}</p>
        </div>
      </div>

      <button
        onClick={onNewBooking}
        className="px-6 py-2.5 bg-gray-900 text-white font-semibold rounded-lg
                   hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500
                   focus:ring-offset-2 transition-colors duration-150"
      >
        Make Another Booking
      </button>
    </div>
  );
}
