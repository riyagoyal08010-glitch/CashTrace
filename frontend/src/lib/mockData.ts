import type { CityInfo, CrimeCategory, ThreatEvent, RiskLevel, BankDetails, PoliceStationDetails } from './types';

export const CITIES: CityInfo[] = [
  { name: 'Mumbai', state: 'Maharashtra', lat: 19.076, lng: 72.8778, population: 20410000 },
  { name: 'Delhi', state: 'Delhi', lat: 28.6139, lng: 77.209, population: 31180000 },
  { name: 'Bangalore', state: 'Karnataka', lat: 12.9716, lng: 77.5946, population: 13193000 },
  { name: 'Hyderabad', state: 'Telangana', lat: 17.385, lng: 78.4867, population: 10269000 },
  { name: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707, population: 11536000 },
  { name: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639, population: 15484000 },
  { name: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567, population: 6683000 },
  { name: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lng: 72.5714, population: 8401000 },
  { name: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873, population: 3971000 },
  { name: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8467, lng: 80.9462, population: 3839000 },
  { name: 'Surat', state: 'Gujarat', lat: 21.1702, lng: 72.8311, population: 6961000 },
  { name: 'Kochi', state: 'Kerala', lat: 9.9312, lng: 76.2673, population: 2305000 },
  { name: 'Bhopal', state: 'Madhya Pradesh', lat: 23.2599, lng: 77.4126, population: 2368000 },
  { name: 'Patna', state: 'Bihar', lat: 25.5941, lng: 85.1376, population: 2491000 },
  { name: 'Chandigarh', state: 'Punjab', lat: 30.7333, lng: 76.7794, population: 1146000 },
  { name: 'Guwahati', state: 'Assam', lat: 26.1445, lng: 91.7362, population: 1241000 },
  { name: 'Bhubaneswar', state: 'Odisha', lat: 20.296, lng: 85.8245, population: 1147000 },
  { name: 'Nagpur', state: 'Maharashtra', lat: 21.1458, lng: 79.0882, population: 3372000 },
  { name: 'Indore', state: 'Madhya Pradesh', lat: 22.7196, lng: 75.8577, population: 2574000 },
  { name: 'Visakhapatnam', state: 'Andhra Pradesh', lat: 17.6868, lng: 83.2185, population: 2435000 },
  { name: 'Coimbatore', state: 'Tamil Nadu', lat: 11.0168, lng: 76.9558, population: 2060000 },
  { name: 'Thiruvananthapuram', state: 'Kerala', lat: 8.5241, lng: 76.9366, population: 1680000 },
  { name: 'Ranchi', state: 'Jharkhand', lat: 23.3441, lng: 85.3096, population: 1485000 },
  { name: 'Raipur', state: 'Chhattisgarh', lat: 21.2514, lng: 81.6296, population: 1640000 },
  { name: 'Dehradun', state: 'Uttarakhand', lat: 30.3165, lng: 78.0322, population: 916000 },
  { name: 'Shimla', state: 'Himachal Pradesh', lat: 31.1048, lng: 77.1734, population: 285000 },
  { name: 'Srinagar', state: 'Jammu & Kashmir', lat: 34.0837, lng: 74.7973, population: 1560000 },
  { name: 'Panaji', state: 'Goa', lat: 15.4909, lng: 73.8278, population: 260000 },
  { name: 'Agartala', state: 'Tripura', lat: 23.8315, lng: 91.2868, population: 675000 },
  { name: 'Itanagar', state: 'Arunachal Pradesh', lat: 27.0844, lng: 93.6053, population: 98000 },
];

export const CATEGORIES: CrimeCategory[] = [
  'ATM Fraud',
  'Card Skimming',
  'Phishing',
  'UPI Fraud',
  'Identity Theft',
  'Crypto Scam',
];

export const CATEGORY_COLORS: Record<CrimeCategory, string> = {
  'ATM Fraud': '#e2657a',
  'Card Skimming': '#ed9b78',
  'Phishing': '#edbe7d',
  'UPI Fraud': '#7cc4c1',
  'Identity Theft': '#ad97c9',
  'Crypto Scam': '#d994bd',
};

const ATM_LOCATIONS = [
  'HDFC ATM - Linking Road', 'SBI ATM - Connaught Place', 'ICICI ATM - MG Road',
  'Axis ATM - Brigade Road', 'PNB ATM - Park Street', 'Canara ATM - FC Road',
  'BOI ATM - Ashok Rajpath', 'Yes Bank ATM - Satara Road', 'Kotak ATM - Ring Road',
  'Union Bank ATM - Lalbagh', 'Federal Bank ATM - Marine Drive', 'IndusInd ATM - Sector 17',
];

interface CityLocationProfile {
  bankNames: string[];
  branches: string[];
  policeStation: string;
  jurisdiction: string;
  phone: string;
}

const CITY_LOCATION_PROFILES: Record<string, CityLocationProfile> = {
  Mumbai: {
    bankNames: ['HDFC Bank', 'ICICI Bank', 'Axis Bank'],
    branches: ['Linking Road Branch', 'Andheri West Branch', 'Fort Branch'],
    policeStation: 'Mumbai Cyber Crime Cell',
    jurisdiction: 'Mumbai City Cyber Division',
    phone: '022-23092309',
  },
  Delhi: {
    bankNames: ['SBI', 'HDFC Bank', 'Punjab National Bank'],
    branches: ['Connaught Place Branch', 'Nehru Place Branch', 'Karol Bagh Branch'],
    policeStation: 'Connaught Place Cyber Police Station',
    jurisdiction: 'Central District Cyber Cell',
    phone: '011-23470000',
  },
  Bangalore: {
    bankNames: ['ICICI Bank', 'Axis Bank', 'Canara Bank'],
    branches: ['MG Road Branch', 'Indiranagar Branch', 'Brigade Road Branch'],
    policeStation: 'Bangalore Cyber Crime Police Station',
    jurisdiction: 'Bengaluru Urban Cyber Crime Division',
    phone: '080-22942222',
  },
  Hyderabad: {
    bankNames: ['HDFC Bank', 'SBI', 'Kotak Mahindra'],
    branches: ['Banjara Hills Branch', 'Hitech City Branch', 'Jubilee Hills Branch'],
    policeStation: 'Cyber Crime PS - Cyberabad',
    jurisdiction: 'Cyberabad Commissionerate',
    phone: '040-27852600',
  },
  Chennai: {
    bankNames: ['SBI', 'HDFC Bank', 'Indian Bank'],
    branches: ['Anna Salai Branch', 'T Nagar Branch', 'Adyar Branch'],
    policeStation: 'Chennai Cyber Crime Branch',
    jurisdiction: 'Greater Chennai Cyber Crime Division',
    phone: '044-28447700',
  },
  Kolkata: {
    bankNames: ['SBI', 'Axis Bank', 'Bank of Baroda'],
    branches: ['Park Street Branch', 'Salt Lake Branch', 'Camac Street Branch'],
    policeStation: 'Kolkata Cyber Crime Police Station',
    jurisdiction: 'Kolkata Police Cyber Crime Division',
    phone: '033-22142000',
  },
  Pune: {
    bankNames: ['HDFC Bank', 'ICICI Bank', 'Bank of Maharashtra'],
    branches: ['FC Road Branch', 'Koregaon Park Branch', 'Kothrud Branch'],
    policeStation: 'Pune Cyber Crime Unit',
    jurisdiction: 'Pune City Cyber Crime Division',
    phone: '020-26122880',
  },
  Kochi: {
    bankNames: ['SBI', 'Federal Bank', 'HDFC Bank'],
    branches: ['MG Road Branch', 'Marine Drive Branch', 'Vyttila Branch'],
    policeStation: 'Kochi Cyber Crime Police Station',
    jurisdiction: 'Ernakulam District Cyber Cell',
    phone: '0484-2394500',
  },
  Thiruvananthapuram: {
    bankNames: ['SBI', 'Federal Bank', 'South Indian Bank'],
    branches: ['MG Road Branch', 'Vazhuthacaud Branch', 'Pattom Branch'],
    policeStation: 'Thiruvananthapuram Cyber Crime Police Station',
    jurisdiction: 'Thiruvananthapuram City Cyber Cell',
    phone: '0471-2322212',
  },
};

const DEFAULT_LOCATION_PROFILE: CityLocationProfile = {
  bankNames: ['SBI', 'HDFC Bank', 'ICICI Bank'],
  branches: ['Main Branch', 'City Centre Branch', 'Market Road Branch'],
  policeStation: 'Cyber Crime Police Station',
  jurisdiction: 'District Cyber Crime Division',
  phone: '112',
};

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function jitter(base: number, range: number): number {
  return base + (Math.random() - 0.5) * range;
}

function generateBankDetails(cityName: string, lat: number, lng: number): BankDetails {
  const profile = CITY_LOCATION_PROFILES[cityName] ?? DEFAULT_LOCATION_PROFILE;
  const name = randomFrom(profile.bankNames);
  const branch = randomFrom(profile.branches);
  const offsetLat = (Math.random() - 0.5) * 0.01;
  const offsetLng = (Math.random() - 0.5) * 0.01;
  return {
    name,
    branch,
    lat: lat + offsetLat,
    lng: lng + offsetLng,
  };
}

function generatePoliceStation(cityName: string, lat: number, lng: number): PoliceStationDetails {
  const profile = CITY_LOCATION_PROFILES[cityName] ?? DEFAULT_LOCATION_PROFILE;
  const distanceKm = 0.5 + Math.random() * 2.0;
  const angle = Math.random() * Math.PI * 2;
  const latOffset = (distanceKm / 111) * Math.cos(angle);
  const lngOffset = (distanceKm / (111 * Math.cos(lat * Math.PI / 180))) * Math.sin(angle);
  return {
    name: profile.policeStation,
    jurisdiction: profile.jurisdiction,
    distanceKm: Math.round(distanceKm * 10) / 10,
    lat: lat + latOffset,
    lng: lng + lngOffset,
    phone: profile.phone,
  };
}

const DESCRIPTIONS: Record<CrimeCategory, string[]> = {
  'ATM Fraud': [
    'Multiple failed PIN attempts at off-hours',
    'Suspicious cash withdrawal pattern detected',
    'Card cloning device suspected at terminal',
    'Unusual withdrawal frequency from single ATM',
    'Cash extraction exceeding daily limit threshold',
  ],
  'Card Skimming': [
    'Skimmer device detected on card reader',
    'Duplicate card transaction at distant location',
    'Magnetic stripe data compromise flagged',
    'Hidden camera identified above keypad',
    'Overlay keypad anomaly reported by customer',
  ],
  'Phishing': [
    'Banking credentials entered on spoofed portal',
    'SMS phishing link clicked by victim',
    'Fake customer care number led to UPI transfer',
    'Email credential harvest from lookalike domain',
    'OTP shared via social engineering call',
  ],
  'UPI Fraud': [
    'High-value UPI transfer to newly created VPA',
    'Multiple rapid UPI debits from single account',
    'Remote screen share enabled during transaction',
    'Suspicious UPI collect request chain',
    'Unverified merchant UPI ID receiving funds',
  ],
  'Identity Theft': [
    'Synthetic identity applied for new bank account',
    'Aadhaar-linked SIM issued via forged documents',
    'Loan application using stolen KYC details',
    ' PAN mismatch detected in credit application',
    'Identity reuse across multiple banking portals',
  ],
  'Crypto Scam': [
    'Funds routed to known exchange scam wallet',
    'P2P crypto trade linked to investment fraud',
    'Fake crypto mining deposit address detected',
    'Chain-hopping pattern from stolen funds',
    'Withdrawal to mixer service identified',
  ],
};

const STATUSES: ThreatEvent['status'][] = ['flagged', 'investigating', 'blocked'];

let eventCounter = 0;

export function generateThreatEvent(highRiskOnly = false): ThreatEvent {
  const city = randomFrom(CITIES);
  const category = randomFrom(CATEGORIES);
  const riskScore = highRiskOnly
    ? 0.85 + Math.random() * 0.14
    : Math.random();
  const amount = Math.round((1000 + Math.random() * 499000) / 100) * 100;

  eventCounter += 1;
  const id = `I4C-${Date.now()}-${eventCounter.toString().padStart(4, '0')}`;

  const eventLat = jitter(city.lat, 0.6);
  const eventLng = jitter(city.lng, 0.6);

  return {
    id,
    city: city.name,
    state: city.state,
    lat: eventLat,
    lng: eventLng,
    riskScore: Math.round(riskScore * 100) / 100,
    category,
    amount,
    timestamp: Date.now(),
    description: randomFrom(DESCRIPTIONS[category]),
    status: randomFrom(STATUSES),
    bankDetails: generateBankDetails(city.name, eventLat, eventLng),
    nearestPoliceStation: generatePoliceStation(city.name, eventLat, eventLng),
  };
}

export function generateInitialEvents(count: number): ThreatEvent[] {
  const events: ThreatEvent[] = [];
  for (let i = 0; i < count; i++) {
    events.push(generateThreatEvent());
  }
  return events.sort((a, b) => b.timestamp - a.timestamp);
}

export function getRiskLevel(score: number): RiskLevel {
  if (score >= 0.9) return 'critical';
  if (score >= 0.75) return 'high';
  return 'moderate';
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function formatRelative(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 5000) return 'just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}
