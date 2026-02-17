'use client';

import { useEffect, useState, useCallback } from 'react';
import { Screening, Seat, Booking } from '@/lib/types';
import { getSeatLabel } from '@/lib/validation';

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [storedPassword, setStoredPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [screening, setScreening] = useState<Screening | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Edit form state
  const [filmName, setFilmName] = useState('');
  const [screeningDate, setScreeningDate] = useState('');
  const [screeningTime, setScreeningTime] = useState('');
  const [saving, setSaving] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setAuthError('Please enter the admin password');
      return;
    }
    setStoredPassword(password);
    setAuthenticated(true);
    setAuthError('');
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/screening');
      const json = await res.json();
      if (json.success) {
        setScreening(json.data.screening);
        setSeats(json.data.seats);
        setFilmName(json.data.screening.film_name);
        setScreeningDate(json.data.screening.screening_date);
        setScreeningTime(json.data.screening.screening_time.slice(0, 5));
      }
    } catch {
      setError('Failed to fetch data');
    }

    // Fetch bookings — we'll use the service Supabase via a simple fetch
    // Since bookings are exposed via RLS read policy, we can use the public client
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const res = await fetch(
        `${supabaseUrl}/rest/v1/bookings?select=*&order=booked_at.desc`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        }
      );
      const data = await res.json();
      if (Array.isArray(data)) {
        setBookings(data);
      }
    } catch {
      // Non-critical
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (authenticated) {
      fetchData();
    }
  }, [authenticated, fetchData]);

  const handleUpdateScreening = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!screening) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/admin/screening', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': storedPassword,
        },
        body: JSON.stringify({
          screeningId: screening.id,
          filmName,
          screeningDate,
          screeningTime: screeningTime + ':00',
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSuccess('Screening updated successfully');
        setScreening(json.data);
      } else {
        if (res.status === 401) {
          setAuthenticated(false);
          setAuthError('Invalid password');
        }
        setError(json.error || 'Failed to update');
      }
    } catch {
      setError('Failed to update screening');
    } finally {
      setSaving(false);
    }
  };

  // Password gate
  if (!authenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h1 className="text-xl font-bold text-gray-900 text-center mb-6">
              Admin Access
            </h1>
            {authError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {authError}
              </div>
            )}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="admin-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  id="admin-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                             text-gray-900 placeholder-gray-400"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-gray-900 text-white font-semibold rounded-lg
                           hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500
                           focus:ring-offset-2 transition-colors"
              >
                Sign In
              </button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  const seatsByRow: Record<string, Seat[]> = {};
  for (const seat of seats) {
    if (!seatsByRow[seat.row_label]) {
      seatsByRow[seat.row_label] = [];
    }
    seatsByRow[seat.row_label].push(seat);
  }

  return (
    <main className="min-h-screen">
      <header className="bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <a href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
            ← Back to site
          </a>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            {success}
          </div>
        )}

        {/* Edit Screening */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Edit Screening</h2>
          <form onSubmit={handleUpdateScreening} className="space-y-4">
            <div>
              <label htmlFor="film-name" className="block text-sm font-medium text-gray-700 mb-1">
                Film Name
              </label>
              <input
                type="text"
                id="film-name"
                value={filmName}
                onChange={(e) => setFilmName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                           text-gray-900"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="screening-date" className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  id="screening-date"
                  value={screeningDate}
                  onChange={(e) => setScreeningDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                             text-gray-900"
                />
              </div>
              <div>
                <label htmlFor="screening-time" className="block text-sm font-medium text-gray-700 mb-1">
                  Time
                </label>
                <input
                  type="time"
                  id="screening-time"
                  value={screeningTime}
                  onChange={(e) => setScreeningTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                             text-gray-900"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="py-2.5 px-6 bg-blue-600 text-white font-semibold rounded-lg
                         hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500
                         focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed
                         transition-colors"
            >
              {saving ? 'Saving...' : 'Update Screening'}
            </button>
          </form>
        </div>

        {/* Seat Status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Seat Status</h2>
            <button
              onClick={fetchData}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Refresh
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Seat</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Status</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Session</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Held Until</th>
                </tr>
              </thead>
              <tbody>
                {seats
                  .sort((a, b) => a.seat_number - b.seat_number)
                  .map((seat) => (
                    <tr key={seat.id} className="border-b border-gray-100">
                      <td className="py-2 px-3 font-medium text-gray-900">
                        {getSeatLabel(seat)}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                            seat.status === 'available'
                              ? 'bg-green-100 text-green-700'
                              : seat.status === 'held'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {seat.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-gray-500 font-mono text-xs">
                        {seat.held_by_session?.slice(0, 8) ||
                          seat.booked_by_session?.slice(0, 8) ||
                          '—'}
                      </td>
                      <td className="py-2 px-3 text-gray-500 text-xs">
                        {seat.held_until
                          ? new Date(seat.held_until).toLocaleTimeString()
                          : '—'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bookings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Bookings</h2>
          {bookings.length === 0 ? (
            <p className="text-gray-500 text-sm">No bookings yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Name</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Email</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Seats</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Booked At</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => {
                    // Map seat IDs to labels
                    const bookedSeats = booking.seat_ids
                      .map((sid) => {
                        const seat = seats.find((s) => s.id === sid);
                        return seat ? getSeatLabel(seat) : sid.slice(0, 8);
                      })
                      .sort();

                    return (
                      <tr key={booking.id} className="border-b border-gray-100">
                        <td className="py-2 px-3 font-medium text-gray-900">
                          {booking.customer_name}
                        </td>
                        <td className="py-2 px-3 text-gray-500">
                          {booking.customer_email}
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex gap-1 flex-wrap">
                            {bookedSeats.map((label, i) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium"
                              >
                                {label}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-gray-500 text-xs">
                          {new Date(booking.booked_at).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
