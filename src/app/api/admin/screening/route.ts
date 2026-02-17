import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function PUT(request: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const providedPassword = request.headers.get('x-admin-password');

  if (!adminPassword || providedPassword !== adminPassword) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const supabase = getServiceSupabase();

  let body: { screeningId: string; filmName: string; screeningDate: string; screeningTime: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }

  const { screeningId, filmName, screeningDate, screeningTime } = body;

  if (!screeningId || !filmName || !screeningDate || !screeningTime) {
    return NextResponse.json(
      { success: false, error: 'Missing required fields' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('screenings')
    .update({
      film_name: filmName,
      screening_date: screeningDate,
      screening_time: screeningTime,
    })
    .eq('id', screeningId)
    .select()
    .single();

  if (error) {
    console.error('Update screening error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update screening' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data });
}
