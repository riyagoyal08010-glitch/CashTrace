export type CrimeCategory =
  | 'ATM Fraud'
  | 'Card Skimming'
  | 'Phishing'
  | 'UPI Fraud'
  | 'Identity Theft'
  | 'Crypto Scam';

export type RiskLevel = 'critical' | 'high' | 'moderate';

export interface BankDetails {
  name: string;
  branch: string;
  lat: number;
  lng: number;
}

export interface PoliceStationDetails {
  name: string;
  jurisdiction: string;
  distanceKm: number;
  lat: number;
  lng: number;
  phone: string;
}

export interface ThreatEvent {
  id: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  riskScore: number;
  category: CrimeCategory;
  amount: number;
  timestamp: number;
  description: string;
  status: 'flagged' | 'investigating' | 'blocked';
  bankDetails: BankDetails;
  nearestPoliceStation: PoliceStationDetails;
}

export interface CityInfo {
  name: string;
  state: string;
  lat: number;
  lng: number;
  population: number;
}

export interface Filters {
  city: string | 'all';
  minRiskScore: number;
  category: CrimeCategory | 'all';
}
