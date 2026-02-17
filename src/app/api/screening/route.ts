import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET() {
  const supabase = getServiceSupabase();

  // Release expired holds on every read
  await supabase.rpc('release_expired_holds');

  // Get the first (active) screening
  const { data: screening, error: screeningError } = await supabase
    .from('screenings')
    .select('*')
    .order('screening_date', { ascending: true })
    .limit(1)
    .single();

  if (screeningError || !screening) {
    return NextResponse.json(
      { success: false, error: 'No screening found' },
      { status: 404 }
    );
  }

  // Get all seats for this screening
  const { data: seats, error: seatsError } = await supabase
    .from('seats')
    .select('*')
    .eq('screening_id', screening.id)
    .order('seat_number', { ascending: true });

  if (seatsError) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch seats' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      screening,
      seats,
    },
  });
}
