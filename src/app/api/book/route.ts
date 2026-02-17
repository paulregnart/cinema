import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { BookRequest } from '@/lib/types';

export async function POST(request: NextRequest) {
  const supabase = getServiceSupabase();

  let body: BookRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }

  const { seatIds, sessionId, screeningId, customerName, customerEmail } = body;

  if (!seatIds || !sessionId || !screeningId || !customerName || !customerEmail) {
    return NextResponse.json(
      { success: false, error: 'Missing required fields' },
      { status: 400 }
    );
  }

  if (!Array.isArray(seatIds) || seatIds.length < 1 || seatIds.length > 5) {
    return NextResponse.json(
      { success: false, error: 'Invalid number of seats' },
      { status: 400 }
    );
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(customerEmail)) {
    return NextResponse.json(
      { success: false, error: 'Invalid email address' },
      { status: 400 }
    );
  }

  // Call the atomic Postgres function
  const { data, error } = await supabase.rpc('book_seats', {
    p_seat_ids: seatIds,
    p_session_id: sessionId,
    p_screening_id: screeningId,
    p_customer_name: customerName,
    p_customer_email: customerEmail,
  });

  if (error) {
    console.error('book_seats RPC error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to book seats' },
      { status: 500 }
    );
  }

  if (!data.success) {
    return NextResponse.json(
      { success: false, error: data.error },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    data: { bookingId: data.bookingId },
  });
}
