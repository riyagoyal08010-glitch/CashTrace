import { useEffect, useState } from 'react';
import type { ThreatEvent } from '@/lib/types';

const API_URL = 'http://127.0.0.1:8000';

export function useThreatFeed() {
  const [events, setEvents] = useState<ThreatEvent[]>([]);
  const [liveCount, setLiveCount] = useState(0);
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch(`${API_URL}/risk/withdrawals`);

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        console.log('Backend data:', data);

        const mappedEvents: ThreatEvent[] = data.results.map((item: any) => ({
          id: item.withdrawal_id,
        city: item.city ?? 'Unknown',
          state: 'India',
          lat: item.latitude,
          lng: item.longitude,
          riskScore: item.risk_score > 1 ? item.risk_score / 100 : item.risk_score,
          category: 'ATM Fraud',
          amount: item.amount,
          timestamp: new Date(item.timestamp).getTime(),
          description: `Cash withdrawal detected at ${item.location_name ?? 'unknown location'}`,
          status: (item.risk_score > 1 ? item.risk_score / 100 : item.risk_score) >= 0.85
  ? 'flagged'
  : 'investigating',

          bankDetails: {
            name: 'Bank information unavailable',
            branch: 'N/A',
            lat: item.latitude,
            lng: item.longitude,
          },

          nearestPoliceStation: {
            name: 'Cyber Crime Police Station',
            jurisdiction: 'Local Jurisdiction',
            distanceKm: 0,
            lat: item.latitude,
            lng: item.longitude,
            phone: '112',
          },
        }));

        setEvents(mappedEvents);
        setLiveCount(mappedEvents.length);
      } catch (error) {
        console.error('Failed to fetch backend data:', error);
      }
    };

    fetchEvents();
  }, []);

  const simulateFraudEvent = () => {
    console.log('ML/fraud simulation will be connected later.');
  };

  return {
    events,
    liveCount,
    isLive,
    setIsLive,
    simulateFraudEvent,
  };
}