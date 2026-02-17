export interface Screening {
  id: string;
  film_name: string;
  screening_date: string;
  screening_time: string;
  created_at: string;
}

export type SeatStatus = 'available' | 'held' | 'booked';

export interface Seat {
  id: string;
  screening_id: string;
  seat_number: number;
  row_label: string;
  status: SeatStatus;
  held_until: string | null;
  held_by_session: string | null;
  booked_by_session: string | null;
  created_at: string;
}

export interface Booking {
  id: string;
  screening_id: string;
  seat_ids: string[];
  customer_name: string;
  customer_email: string;
  session_id: string;
  booked_at: string;
}

export interface HoldRequest {
  seatIds: string[];
  sessionId: string;
  screeningId: string;
}

export interface BookRequest {
  seatIds: string[];
  sessionId: string;
  screeningId: string;
  customerName: string;
  customerEmail: string;
}

export interface ReleaseRequest {
  sessionId: string;
  screeningId?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  error?: string;
  data?: T;
}
