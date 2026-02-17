'use client';

import { useEffect, useState } from 'react';

interface CountdownTimerProps {
  heldUntil: string; // ISO timestamp
  onExpire: () => void;
}

export default function CountdownTimer({ heldUntil, onExpire }: CountdownTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  useEffect(() => {
    const calcRemaining = () => {
      const remaining = Math.max(
        0,
        Math.floor((new Date(heldUntil).getTime() - Date.now()) / 1000)
      );
      return remaining;
    };

    setSecondsLeft(calcRemaining());

    const interval = setInterval(() => {
      const remaining = calcRemaining();
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onExpire();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [heldUntil, onExpire]);

  if (secondsLeft <= 0) {
    return null;
  }

  const isUrgent = secondsLeft <= 15;

  return (
    <div
      className={`
        flex items-center justify-center gap-2 p-3 rounded-lg text-sm font-medium
        ${isUrgent
          ? 'bg-red-50 border border-red-200 text-red-700'
          : 'bg-blue-50 border border-blue-200 text-blue-700'
        }
      `}
    >
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span>
        Seats held for <strong>{secondsLeft}s</strong>
      </span>
    </div>
  );
}
