import { config } from '../config.js';

export interface TimerState {
  auctionId: string;
  remainingSeconds: number;
  timerLength: number;
  isRunning: boolean;
  lastTickTime: number;
}

const timerStates = new Map<string, TimerState>();
const timerIntervals = new Map<string, NodeJS.Timeout>();

export function startTimer(auctionId: string, timerLength: number) {
  if (timerIntervals.has(auctionId)) {
    clearInterval(timerIntervals.get(auctionId));
  }

  const state: TimerState = {
    auctionId,
    remainingSeconds: timerLength,
    timerLength,
    isRunning: true,
    lastTickTime: Date.now(),
  };

  timerStates.set(auctionId, state);

  const intervalId = setInterval(() => {
    const now = Date.now();
    const state = timerStates.get(auctionId);

    if (!state || !state.isRunning) {
      return;
    }

    const elapsedMs = now - state.lastTickTime;
    const elapsedSeconds = elapsedMs / 1000;

    state.remainingSeconds = Math.max(0, state.remainingSeconds - elapsedSeconds);
    state.lastTickTime = now;

    if (state.remainingSeconds <= 0) {
      state.isRunning = false;
      state.remainingSeconds = 0;
    }
  }, config.timerInterval);

  timerIntervals.set(auctionId, intervalId);

  return state;
}

export function resetTimer(auctionId: string, timerLength?: number) {
  const state = timerStates.get(auctionId);

  if (!state) {
    return startTimer(auctionId, timerLength || config.defaultTimerLength);
  }

  state.remainingSeconds = timerLength || state.timerLength;
  state.isRunning = true;
  state.lastTickTime = Date.now();

  return state;
}

export function getTimerState(auctionId: string): TimerState | null {
  return timerStates.get(auctionId) || null;
}

export function stopTimer(auctionId: string) {
  const state = timerStates.get(auctionId);
  if (state) {
    state.isRunning = false;
  }

  if (timerIntervals.has(auctionId)) {
    clearInterval(timerIntervals.get(auctionId));
    timerIntervals.delete(auctionId);
  }
}

export function getFormattedTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function clearAllTimers() {
  timerIntervals.forEach((intervalId) => clearInterval(intervalId));
  timerIntervals.clear();
  timerStates.clear();
}
