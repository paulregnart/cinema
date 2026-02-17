'use client';

import { useState } from 'react';

interface BookingFormProps {
  selectedCount: number;
  onSubmit: (name: string, email: string) => Promise<void>;
  disabled?: boolean;
}

export default function BookingForm({
  selectedCount,
  onSubmit,
  disabled = false,
}: BookingFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(name.trim(), email.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Booking failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">
        Complete your booking ({selectedCount} {selectedCount === 1 ? 'seat' : 'seats'})
      </h3>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Full Name
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="John Smith"
          disabled={disabled || submitting}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                     disabled:bg-gray-100 disabled:cursor-not-allowed
                     text-gray-900 placeholder-gray-400"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email Address
        </label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="john@example.com"
          disabled={disabled || submitting}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                     disabled:bg-gray-100 disabled:cursor-not-allowed
                     text-gray-900 placeholder-gray-400"
        />
      </div>

      <button
        type="submit"
        disabled={disabled || submitting || selectedCount === 0}
        className="w-full py-2.5 px-4 bg-blue-600 text-white font-semibold rounded-lg
                   hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500
                   focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed
                   transition-colors duration-150"
      >
        {submitting ? 'Booking...' : 'Confirm Booking'}
      </button>
    </form>
  );
}
