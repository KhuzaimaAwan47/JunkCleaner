import { useEffect, useRef, useState } from 'react';
import { useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

export function useScanTimer(isScanning: boolean) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const pulseScale = useSharedValue(1);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (isScanning) {
      pulseScale.value = withRepeat(
        withSequence(withTiming(1.05, { duration: 1000 }), withTiming(1, { duration: 1000 })),
        -1,
        true
      );
      startTimeRef.current = Date.now();
      setElapsedTime(0);
      timerIntervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 100);
    } else {
      pulseScale.value = withTiming(1, { duration: 300 });
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      startTimeRef.current = null;
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isScanning, pulseScale]);

  return { elapsedTime, pulseScale };
}

// Default export to satisfy expo-router while keeping this as a non-route module
export default function ScanTimerRoute(): null {
  return null;
}

