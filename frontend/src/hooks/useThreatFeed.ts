import { useCallback, useEffect, useRef, useState } from 'react';
import type { ThreatEvent } from '@/lib/types';
import { generateInitialEvents, generateThreatEvent } from '@/lib/mockData';

const MAX_EVENTS = 200;
const TICK_INTERVAL = 4000;

export function useThreatFeed() {
  const [events, setEvents] = useState<ThreatEvent[]>(() => generateInitialEvents(40));
  const [liveCount, setLiveCount] = useState(0);
  const [isLive, setIsLive] = useState(true);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tick = useCallback(() => {
    setEvents((prev) => {
      const newEvent = generateThreatEvent();
      const next = [newEvent, ...prev];
      if (next.length > MAX_EVENTS) next.length = MAX_EVENTS;
      return next;
    });
    setLiveCount((c) => c + 1);
  }, []);

  useEffect(() => {
    if (!isLive) {
      if (tickRef.current) clearInterval(tickRef.current);
      return;
    }
    tickRef.current = setInterval(tick, TICK_INTERVAL);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [isLive, tick]);

  const simulateFraudEvent = useCallback(() => {
    const burst = 5;
    setEvents((prev) => {
      const newEvents: ThreatEvent[] = [];
      for (let i = 0; i < burst; i++) {
        newEvents.push(generateThreatEvent(true));
      }
      return [...newEvents, ...prev].slice(0, MAX_EVENTS);
    });
    setLiveCount((c) => c + burst);
  }, []);

  return { events, liveCount, isLive, setIsLive, simulateFraudEvent };
}
