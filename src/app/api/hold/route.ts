import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { HoldRequest } from '@/lib/types';

export async function POST(request: NextRequest) {
  const supabase = getServiceSupabase();

  let body: HoldRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }

  const { seatIds, sessionId, screeningId } = body;

  if (!seatIds || !sessionId || !screeningId) {
    return NextResponse.json(
      { success: false, error: 'Missing required fields: seatIds, sessionId, screeningId' },
      { status: 400 }
    );
  }

  if (!Array.isArray(seatIds) || seatIds.length < 1 || seatIds.length > 5) {
    return NextResponse.json(
      { success: false, error: 'You must select between 1 and 5 seats' },
      { status: 400 }
    );
  }

  // Call the atomic Postgres function
  const { data, error } = await supabase.rpc('hold_seats', {
    p_seat_ids: seatIds,
    p_session_id: sessionId,
    p_screening_id: screeningId,
  });

  if (error) {
    console.error('hold_seats RPC error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to hold seats' },
      { status: 500 }
    );
  }

  if (!data.success) {
    return NextResponse.json(
      { success: false, error: data.error },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}
