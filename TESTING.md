# Testing Guide

This project includes a comprehensive test suite using Jest and React Testing Library.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Coverage

The test suite covers:

### ✅ Validation Logic (`src/lib/__tests__/validation.test.ts`)
- Seat position and row calculations
- Seat labeling (A1, B2, etc.)
- Isolated seat detection
- Single/multiple seat selection validation
- Edge cases (last seat in row, contiguous selections)

### ✅ Components (`src/components/__tests__/`)

**SeatGrid** (`SeatGrid.test.tsx`)
- Renders all 20 seats correctly
- Displays row labels A-D and screen indicator  
- Handles seat clicks and selection states
- Properly disables unavailable seats (booked, held by others)
- Shows correct visual states (available, selected, held, booked)
- Respects disabled prop

**BookingForm** (`BookingForm.test.tsx`)
- Renders with correct seat count
- Validates name and email inputs
- Trims whitespace from inputs
- Shows error messages for invalid inputs
- Handles form submission correctly
- Disables inputs during submission
- Shows loading state

**CountdownTimer** (`CountdownTimer.test.tsx`)
- Displays countdown correctly
- Counts down in real-time
- Calls onExpire when timer reaches zero
- Shows urgent styling when < 15 seconds remain
- Cleans up intervals on unmount

### ⚠️ API Routes (`src/app/api/__tests__/routes.test.ts`)
- **Skipped** - Requires Next.js edge runtime environment
- For full API testing, use integration tests with a test server or Vercel preview environments

## Test Structure

```
src/
├── lib/__tests__/
│   └── validation.test.ts
├── components/__tests__/
│   ├── SeatGrid.test.tsx
│   ├── BookingForm.test.tsx
│   └── CountdownTimer.test.tsx
└── app/api/__tests__/
    └── routes.test.ts (skipped)
```

## Notes

- **API Route Tests**: Skipped in local Jest environment due to Next.js edge runtime requirements. Consider using:
  - E2E testing with Playwright/Cypress
  - Integration tests with a test database
  - Vercel preview deployments for testing

- **Timer Tests**: Use fake timers (`jest.useFakeTimers()`) to control time in tests

- **Flaky Tests**: One BookingForm validation test is currently skipped due to async timing issues

## Future Improvements

- [ ] Add E2E tests with Playwright
- [ ] Add integration tests with a test Supabase database  
- [ ] Increase test coverage to 80%+
- [ ] Add visual regression testing
- [ ] Test real-time Supabase subscription behavior
