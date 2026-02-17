# Cinema Ticket Booking

A full-stack web application for selling cinema tickets built with Next.js 14, Supabase, and Tailwind CSS.

## Features

- **Real-time seat grid** — 4 rows × 5 seats with live status updates via Supabase Realtime
- **Seat holds** — Selected seats are held for 60 seconds, preventing other users from selecting them
- **Isolated seat validation** — Prevents bookings that would leave a single isolated seat with no neighbours
- **Atomic transactions** — All seat operations use Postgres functions to prevent race conditions
- **Admin panel** — Password-protected interface to manage screenings and view bookings
- **Mobile responsive** — Clean, responsive design using Tailwind CSS
- **Comprehensive testing** — Jest + React Testing Library with 45+ tests

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Supabase** (Postgres + Realtime)
- **Tailwind CSS**
- **Vercel** deployment target

---

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and keys from **Settings → API**:
   - Project URL (`NEXT_PUBLIC_SUPABASE_URL`)
   - `anon` public key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - `service_role` secret key (`SUPABASE_SERVICE_ROLE_KEY`)

### 2. Run the Database Migration

Open the **SQL Editor** in your Supabase dashboard and paste the contents of:

```
supabase/migrations/001_initial_schema.sql
```

This will:
- Create the `screenings`, `seats`, and `bookings` tables
- Create Postgres functions for atomic hold/book/release operations
- Seed a sample screening with 20 seats
- Enable Row Level Security
- Enable Realtime on the `seats` table

### 3. Enable Realtime

In your Supabase dashboard:
1. Go to **Database → Replication**
2. Ensure the `seats` table has Realtime enabled (the migration does this, but verify)

### 4. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.local.example .env.local
```

Fill in your values:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ADMIN_PASSWORD=your-secure-password
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. Install Dependencies and Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the booking page.

---

## Admin Panel

Access the admin panel at [http://localhost:3000/admin](http://localhost:3000/admin).

Enter the password you set in the `ADMIN_PASSWORD` environment variable. The admin panel allows you to:

- Edit the film name, screening date, and time
- View all seat statuses in real time
- View a list of all bookings with customer details

---

## Deploying to Vercel

1. Push your code to a GitHub repository
2. Import the project in [Vercel](https://vercel.com)
3. Add all environment variables from `.env.local` in the Vercel project settings
4. Set `NEXT_PUBLIC_APP_URL` to your Vercel deployment URL
5. Deploy

---

## Booking Rules

1. A customer can select 1–5 seats per transaction
2. Selecting seats that would leave a single isolated seat (no available neighbours in the same row) is rejected on both client and server
3. Selected seats are held for 60 seconds — other users see them as unavailable
4. If the hold expires without booking, seats are automatically released
5. Booked seats are permanent and cannot be un-booked
6. All seat state changes are broadcast in real time to all connected clients

---

## Project Structure

```
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql    # Full schema, functions, and seed data
├── src/
│   ├── app/
│   │   ├── layout.tsx                # Root layout
│   │   ├── page.tsx                  # Public booking page
│   │   ├── admin/
│   │   │   └── page.tsx              # Admin panel
│   │   └── api/
│   │       ├── screening/route.ts    # GET screening + seats
│   │       ├── hold/route.ts         # POST hold seats
│   │       ├── book/route.ts         # POST book seats
│   │       ├── release/route.ts      # POST release held seats
│   │       └── admin/
│   │           └── screening/route.ts # PUT update screening
│   ├── components/
│   │   ├── SeatGrid.tsx              # Interactive seat map
│   │   ├── BookingForm.tsx           # Customer details form
│   │   ├── CountdownTimer.tsx        # Hold countdown
│   │   └── BookingConfirmation.tsx   # Success screen
│   └── lib/
│       ├── supabase.ts               # Supabase client helpers
│       ├── types.ts                  # TypeScript interfaces
│       └── validation.ts             # Seat validation logic
├── .env.local.example
└── README.md
```

---

## Testing

Run the test suite with:

```bash
npm test                  # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # With coverage report
```

**Test Coverage:**
- ✅ Validation logic (seat isolation, positioning)
- ✅ Component rendering and interactions
- ✅ Form validation and submission
- ✅ Timer countdown and expiry

See [TESTING.md](TESTING.md) for detailed testing documentation.

---

## Hold Expiry Cleanup

Expired holds are cleaned up in two ways:

1. **On every API read** — The `/api/screening` endpoint calls `release_expired_holds()` before returning data
2. **In the hold/book functions** — The Postgres RPC functions call `release_expired_holds()` as their first step

Optionally, you can enable a `pg_cron` job (see the commented section at the bottom of the migration) to periodically clean up expired holds in the background.