import type { CrimeCategory, ThreatEvent } from './types';
import { CATEGORIES, CATEGORY_COLORS, CITIES } from './mockData';

export interface CategoryBreakdownItem {
  category: CrimeCategory;
  count: number;
  color: string;
  totalAmount: number;
}

export interface CityBreakdownItem {
  city: string;
  events: number;
  criticalEvents: number;
  totalAmount: number;
}

export interface TimeSeriesPoint {
  time: string;
  atmFraud: number;
  cardSkimming: number;
  phishing: number;
  upiFraud: number;
  identityTheft: number;
  cryptoScam: number;
}

export interface RiskDistribution {
  range: string;
  count: number;
  fill: string;
}

export function computeCategoryBreakdown(events: ThreatEvent[]): CategoryBreakdownItem[] {
  const map = new Map<CrimeCategory, CategoryBreakdownItem>();
  for (const cat of CATEGORIES) {
    map.set(cat, { category: cat, count: 0, color: CATEGORY_COLORS[cat], totalAmount: 0 });
  }
  for (const e of events) {
    const item = map.get(e.category);
    if (item) {
      item.count += 1;
      item.totalAmount += e.amount;
    }
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

export function computeCityBreakdown(events: ThreatEvent[]): CityBreakdownItem[] {
  const map = new Map<string, CityBreakdownItem>();
  for (const e of events) {
    const existing = map.get(e.city) ?? {
      city: e.city,
      events: 0,
      criticalEvents: 0,
      totalAmount: 0,
    };
    existing.events += 1;
    existing.totalAmount += e.amount;
    if (e.riskScore >= 0.9) existing.criticalEvents += 1;
    map.set(e.city, existing);
  }
  return Array.from(map.values()).sort((a, b) => b.events - a.events).slice(0, 12);
}

export function computeRiskDistribution(events: ThreatEvent[]): RiskDistribution[] {
  const buckets = [
    { range: '0.0–0.2', min: 0, max: 0.2, count: 0, fill: '#84c794' },
    { range: '0.2–0.4', min: 0.2, max: 0.4, count: 0, fill: '#a3d9b0' },
    { range: '0.4–0.6', min: 0.4, max: 0.6, count: 0, fill: '#edbe7d' },
    { range: '0.6–0.75', min: 0.6, max: 0.75, count: 0, fill: '#ed9b78' },
    { range: '0.75–0.9', min: 0.75, max: 0.9, count: 0, fill: '#ed9b78' },
    { range: '0.9–1.0', min: 0.9, max: 1.01, count: 0, fill: '#e2657a' },
  ];
  for (const e of events) {
    const bucket = buckets.find((b) => e.riskScore >= b.min && e.riskScore < b.max);
    if (bucket) bucket.count += 1;
  }
  return buckets.map(({ range, count, fill }) => ({ range, count, fill }));
}

export function computeTimeSeries(events: ThreatEvent[], buckets = 12): TimeSeriesPoint[] {
  if (events.length === 0) return [];
  const now = Date.now();
  const spanMs = 60 * 60 * 1000;
  const bucketSize = spanMs / buckets;

  const slots: TimeSeriesPoint[] = [];
  for (let i = buckets - 1; i >= 0; i--) {
    const time = new Date(now - i * bucketSize);
    const label = time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
    slots.push({
      time: label,
      atmFraud: 0,
      cardSkimming: 0,
      phishing: 0,
      upiFraud: 0,
      identityTheft: 0,
      cryptoScam: 0,
    });
  }

  const baseTime = now - spanMs;
  for (const e of events) {
    if (e.timestamp < baseTime) continue;
    const idx = Math.min(Math.floor((e.timestamp - baseTime) / bucketSize), buckets - 1);
    if (idx < 0) continue;
    const slot = slots[idx];
    switch (e.category) {
      case 'ATM Fraud': slot.atmFraud += 1; break;
      case 'Card Skimming': slot.cardSkimming += 1; break;
      case 'Phishing': slot.phishing += 1; break;
      case 'UPI Fraud': slot.upiFraud += 1; break;
      case 'Identity Theft': slot.identityTheft += 1; break;
      case 'Crypto Scam': slot.cryptoScam += 1; break;
    }
  }
  return slots;
}

export function computeKPIs(events: ThreatEvent[]) {
  const totalAmount = events.reduce((sum, e) => sum + e.amount, 0);
  const criticalCount = events.filter((e) => e.riskScore >= 0.9).length;
  const blockedCount = events.filter((e) => e.status === 'blocked').length;
  const avgRisk = events.length > 0 ? events.reduce((s, e) => s + e.riskScore, 0) / events.length : 0;
  const uniqueCities = new Set(events.map((e) => e.city)).size;

  return {
    totalAmount,
    criticalCount,
    blockedCount,
    avgRisk: Math.round(avgRisk * 100) / 100,
    uniqueCities,
    totalEvents: events.length,
  };
}

export function computeTopCities(events: ThreatEvent[]): { city: string; lat: number; lng: number; count: number; criticalCount: number }[] {
  const cityMap = new Map<string, { city: string; lat: number; lng: number; count: number; criticalCount: number }>();
  const cityInfoMap = new Map(CITIES.map((c) => [c.name, c]));

  for (const e of events) {
    const existing = cityMap.get(e.city);
    if (existing) {
      existing.count += 1;
      if (e.riskScore >= 0.9) existing.criticalCount += 1;
    } else {
      const info = cityInfoMap.get(e.city);
      cityMap.set(e.city, {
        city: e.city,
        lat: info?.lat ?? e.lat,
        lng: info?.lng ?? e.lng,
        count: 1,
        criticalCount: e.riskScore >= 0.9 ? 1 : 0,
      });
    }
  }

  return Array.from(cityMap.values()).sort((a, b) => b.count - a.count);
}
