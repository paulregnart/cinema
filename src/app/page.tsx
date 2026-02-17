'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase';
import { Screening, Seat } from '@/lib/types';
import { validateNoIsolatedSeats } from '@/lib/validation';
import SeatGrid from '@/components/SeatGrid';
import BookingForm from '@/components/BookingForm';
import CountdownTimer from '@/components/CountdownTimer';
import BookingConfirmation from '@/components/BookingConfirmation';

export default function HomePage() {
  const [screening, setScreening] = useState<Screening | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [sessionId, setSessionId] = useState<string>('');
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [holdExpiry, setHoldExpiry] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingConfirmation, setBookingConfirmation] = useState<{
    bookingId: string;
    customerName: string;
  } | null>(null);

  const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize session ID
  useEffect(() => {
    let sid = sessionStorage.getItem('cinema_session_id');
    if (!sid) {
      sid = uuidv4();
      sessionStorage.setItem('cinema_session_id', sid);
    }
    setSessionId(sid);
  }, []);

  // Fetch screening data
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/screening');
      const json = await res.json();
      if (json.success) {
        setScreening(json.data.screening);
        setSeats(json.data.seats);
      } else {
        setError(json.error || 'Failed to load screening');
      }
    } catch {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Subscribe to realtime seat changes
  useEffect(() => {
    if (!screening) return;

    const channel = supabase
      .channel('seats-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'seats',
          filter: `screening_id=eq.${screening.id}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updatedSeat = payload.new as Seat;
            setSeats((prev) =>
              prev.map((s) => (s.id === updatedSeat.id ? updatedSeat : s))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [screening]);

  // Sync selected seats from realtime updates
  useEffect(() => {
    if (!sessionId) return;

    // Find seats currently held by this session
    const myHeldSeats = seats.filter(
      (s) => s.status === 'held' && s.held_by_session === sessionId
    );

    if (myHeldSeats.length > 0) {
      setSelectedSeatIds(myHeldSeats.map((s) => s.id));
      // Use the earliest held_until as the timer
      const earliestExpiry = myHeldSeats
        .filter((s) => s.held_until)
        .map((s) => s.held_until!)
        .sort()[0];
      if (earliestExpiry) {
        setHoldExpiry(earliestExpiry);
      }
    }
  }, [sessionId, seats]);

  // Release seats on page unload
  useEffect(() => {
    if (!sessionId) return;

    const handleBeforeUnload = () => {
      if (selectedSeatIds.length > 0) {
        navigator.sendBeacon(
          '/api/release',
          JSON.stringify({ sessionId, screeningId: screening?.id })
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [sessionId, selectedSeatIds, screening]);

  // Hold seats via API
  const holdSeats = useCallback(
    async (seatIds: string[]) => {
      if (!screening) return;

      try {
        const res = await fetch('/api/hold', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            seatIds,
            sessionId,
            screeningId: screening.id,
          }),
        });
        const json = await res.json();
        if (!json.success) {
          setError(json.error);
          // Re-fetch to get latest state
          await fetchData();
          return false;
        }

        // Set hold expiry (60s from now)
        const expiry = new Date(Date.now() + 60 * 1000).toISOString();
        setHoldExpiry(expiry);
        setError(null);
        return true;
      } catch {
        setError('Failed to hold seats');
        return false;
      }
    },
    [screening, sessionId, fetchData]
  );

  // Release seats
  const releaseSeats = useCallback(async () => {
    if (!screening || !sessionId) return;

    try {
      await fetch('/api/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, screeningId: screening.id }),
      });
    } catch {
      // Ignore release errors
    }

    setSelectedSeatIds([]);
    setHoldExpiry(null);
    setError(null);
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
    }
  }, [screening, sessionId]);

  // Handle seat click
  const handleSeatClick = useCallback(
    async (seat: Seat) => {
      if (bookingConfirmation) return;

      const isCurrentlySelected = selectedSeatIds.includes(seat.id);
      let newSelection: string[];

      if (isCurrentlySelected) {
        newSelection = selectedSeatIds.filter((id) => id !== seat.id);
      } else {
        if (selectedSeatIds.length >= 5) {
          setError('You can select up to 5 seats');
          return;
        }
        newSelection = [...selectedSeatIds, seat.id];
      }

      // Client-side isolation validation
      if (newSelection.length > 0) {
        const validation = validateNoIsolatedSeats(seats, newSelection, sessionId);
        if (!validation.isValid) {
          setError(validation.error || 'Invalid selection');
          return;
        }
      }

      setError(null);
      setSelectedSeatIds(newSelection);

      if (newSelection.length === 0) {
        await releaseSeats();
      } else {
        await holdSeats(newSelection);
      }
    },
    [selectedSeatIds, seats, sessionId, bookingConfirmation, holdSeats, releaseSeats]
  );

  // Handle hold expiry
  const handleHoldExpire = useCallback(() => {
    setSelectedSeatIds([]);
    setHoldExpiry(null);
    setError('Your hold has expired. Please select seats again.');
    fetchData();
  }, [fetchData]);

  // Handle booking submission
  const handleBooking = useCallback(
    async (name: string, email: string) => {
      if (!screening || selectedSeatIds.length === 0) {
        throw new Error('No seats selected');
      }

      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seatIds: selectedSeatIds,
          sessionId,
          screeningId: screening.id,
          customerName: name,
          customerEmail: email,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Booking failed');
      }

      setBookingConfirmation({
        bookingId: json.data.bookingId,
        customerName: name,
      });
      setHoldExpiry(null);
      if (holdTimeoutRef.current) {
        clearTimeout(holdTimeoutRef.current);
      }
    },
    [screening, selectedSeatIds, sessionId]
  );

  // Handle new booking after confirmation
  const handleNewBooking = useCallback(() => {
    setBookingConfirmation(null);
    setSelectedSeatIds([]);
    setHoldExpiry(null);
    setError(null);
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!screening) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">No Screening Available</h2>
          <p className="text-gray-500 mt-2">Check back later for upcoming screenings.</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="bg-gray-900 text-white">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold">Cinema Tickets</h1>
          <div className="mt-3">
            <h2 className="text-xl font-semibold text-blue-300">
              {screening.film_name}
            </h2>
            <p className="text-gray-400 mt-1">
              {new Date(screening.screening_date).toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}{' '}
              at {screening.screening_time.slice(0, 5)}
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {bookingConfirmation ? (
          <BookingConfirmation
            bookingId={bookingConfirmation.bookingId}
            customerName={bookingConfirmation.customerName}
            seats={seats.filter((s) => selectedSeatIds.includes(s.id))}
            filmName={screening.film_name}
            screeningDate={screening.screening_date}
            screeningTime={screening.screening_time}
            onNewBooking={handleNewBooking}
          />
        ) : (
          <>
            {/* Error message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Countdown timer */}
            {holdExpiry && selectedSeatIds.length > 0 && (
              <CountdownTimer
                heldUntil={holdExpiry}
                onExpire={handleHoldExpire}
              />
            )}

            {/* Seat grid */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                Select Your Seats
              </h3>
              <SeatGrid
                seats={seats}
                selectedSeatIds={selectedSeatIds}
                sessionId={sessionId}
                onSeatClick={handleSeatClick}
              />
              <p className="text-center text-xs text-gray-400 mt-4">
                Select 1–5 seats. Held for 60 seconds.
              </p>
            </div>

            {/* Booking form */}
            {selectedSeatIds.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <BookingForm
                  selectedCount={selectedSeatIds.length}
                  onSubmit={handleBooking}
                />
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
