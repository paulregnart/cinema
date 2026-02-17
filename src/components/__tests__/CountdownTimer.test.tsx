import { render, screen, act } from '@testing-library/react';
import CountdownTimer from '../CountdownTimer';

// Mock timers
jest.useFakeTimers();

describe('CountdownTimer', () => {
  const mockOnExpire = jest.fn();

  beforeEach(() => {
    mockOnExpire.mockClear();
    jest.clearAllTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
  });

  it('displays countdown in seconds', () => {
    const heldUntil = new Date(Date.now() + 30000).toISOString(); // 30 seconds from now
    render(<CountdownTimer heldUntil={heldUntil} onExpire={mockOnExpire} />);

    expect(screen.getByText(/30s/)).toBeInTheDocument();
  });

  it('counts down correctly', () => {
    const heldUntil = new Date(Date.now() + 5000).toISOString(); // 5 seconds from now
    render(<CountdownTimer heldUntil={heldUntil} onExpire={mockOnExpire} />);

    expect(screen.getByText(/5s/)).toBeInTheDocument();

    // Advance time by 1 second
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByText(/4s/)).toBeInTheDocument();

    // Advance time by 2 more seconds
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(screen.getByText(/2s/)).toBeInTheDocument();
  });

  it('calls onExpire when timer reaches zero', () => {
    const heldUntil = new Date(Date.now() + 2000).toISOString(); // 2 seconds from now
    render(<CountdownTimer heldUntil={heldUntil} onExpire={mockOnExpire} />);

    expect(mockOnExpire).not.toHaveBeenCalled();

    // Advance past expiry
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(mockOnExpire).toHaveBeenCalledTimes(1);
  });

  it('shows urgent styling when less than 15 seconds remain', () => {
    const heldUntil = new Date(Date.now() + 10000).toISOString(); // 10 seconds from now
    const { container } = render(<CountdownTimer heldUntil={heldUntil} onExpire={mockOnExpire} />);

    // Check for urgent (red) styling
    const timerDiv = container.querySelector('div');
    expect(timerDiv).toHaveClass('bg-red-50');
  });

  it('shows normal styling when more than 15 seconds remain', () => {
    const heldUntil = new Date(Date.now() + 20000).toISOString(); // 20 seconds from now
    const { container } = render(<CountdownTimer heldUntil={heldUntil} onExpire={mockOnExpire} />);

    // Check for normal (blue) styling
    const timerDiv = container.querySelector('div');
    expect(timerDiv).toHaveClass('bg-blue-50');
  });

  it('does not render when timer is already expired', () => {
    const heldUntil = new Date(Date.now() - 1000).toISOString(); // 1 second ago
    const { container } = render(<CountdownTimer heldUntil={heldUntil} onExpire={mockOnExpire} />);

    expect(container.firstChild).toBeNull();
  });

  it('cleans up interval on unmount', () => {
    const heldUntil = new Date(Date.now() + 30000).toISOString();
    const { unmount } = render(<CountdownTimer heldUntil={heldUntil} onExpire={mockOnExpire} />);

    const timerCountBefore = jest.getTimerCount();
    unmount();
    const timerCountAfter = jest.getTimerCount();

    expect(timerCountAfter).toBeLessThan(timerCountBefore);
  });
});
