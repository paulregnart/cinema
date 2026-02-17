import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { ReleaseRequest } from '@/lib/types';

export async function POST(request: NextRequest) {
  const supabase = getServiceSupabase();

  let body: ReleaseRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }

  const { sessionId, screeningId } = body;

  if (!sessionId) {
    return NextResponse.json(
      { success: false, error: 'Missing sessionId' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase.rpc('release_held_seats', {
    p_session_id: sessionId,
    p_screening_id: screeningId || null,
  });

  if (error) {
    console.error('release_held_seats RPC error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to release seats' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data: { released: data.released },
  });
}
