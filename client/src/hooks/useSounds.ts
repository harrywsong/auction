import { useRef, useCallback } from 'react';

const SOUND_FILES: Record<string, string> = {
  bid:          '/sounds/bid.mp3',
  sold:         '/sounds/sold.mp3',
  noSale:       '/sounds/no_sale.mp3',
  timerLow:     '/sounds/timer_low.mp3',
  auctionStart: '/sounds/auction_start.mp3',
  autoAssign:   '/sounds/auto_assign.mp3',
  timerStart:   '/sounds/timer_start.mp3',
  reserve:      '/sounds/reserve.mp3',
  auctionEnd:   '/sounds/auction_end.mp3',
};

// These sounds loop while active
const LOOPING_SOUNDS = new Set(['timerLow']);

type SoundName = keyof typeof SOUND_FILES;

export function useSounds() {
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  const getAudio = useCallback((name: SoundName): HTMLAudioElement | null => {
    if (!audioRefs.current[name]) {
      const path = SOUND_FILES[name];
      if (!path) return null;
      const audio = new Audio(path);
      audio.preload = 'auto';
      audio.volume = 0.35;
      if (LOOPING_SOUNDS.has(name)) {
        audio.loop = true;
      }
      audioRefs.current[name] = audio;
    }
    return audioRefs.current[name];
  }, []);

  const play = useCallback((name: SoundName) => {
    const audio = getAudio(name);
    if (!audio) return;
    // Only restart non-looping sounds from the beginning
    if (!LOOPING_SOUNDS.has(name)) {
      audio.currentTime = 0;
    }
    // Don't restart a looping sound that's already playing
    if (LOOPING_SOUNDS.has(name) && !audio.paused) return;
    audio.play().catch(() => {});
  }, [getAudio]);

  const stop = useCallback((name: SoundName) => {
    const audio = audioRefs.current[name];
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  }, []);

  return { play, stop };
}
