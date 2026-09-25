import { useEffect, useRef, useState } from 'react';
import { createOrderSound } from './orderSound';

export default function useOrderSound(userId) {
  const [state, setState] = useState({ enabled: true, blocked: false });
  const controller = useRef(null);
  if (!controller.current) controller.current = createOrderSound(() => {
    const audio = new Audio('/assets/audio/new-order.wav');
    audio.preload = 'auto';
    return audio;
  }, setState);
  useEffect(() => {
    const sound = controller.current;
    if (!userId) return;
    sound.arm();
    const unlock = () => { void sound.unlock(); };
    const retry = () => { if (document.visibilityState !== 'hidden') void sound.retry(); };
    const retryTimer = setInterval(retry, 10000);
    window.addEventListener('focus', retry);
    document.addEventListener('visibilitychange', retry);
    // Retry blocked audio during a genuine user gesture without requiring a reload.
    document.addEventListener('click', unlock);
    document.addEventListener('keydown', unlock);
    return () => {
      clearInterval(retryTimer);
      window.removeEventListener('focus', retry);
      document.removeEventListener('visibilitychange', retry);
      document.removeEventListener('click', unlock);
      document.removeEventListener('keydown', unlock);
      sound.dispose();
    };
  }, [userId]);
  return { ...state, enable: () => controller.current.enable(), mute: () => controller.current.mute(), notify: () => controller.current.notify() };
}
