// TypeScript interfaces for metal data structure

export interface MetalRate {
  purity: string;
  price: number;
  change: number;
  changePercent: number;
}

export interface HistoryEntry {
  date: string;
  price: number;
  change: number;
}

export interface ChartDataPoint {
  date: string;
  price: number;
}

export interface MetalData {
  name: string;
  symbol: string;
  lastUpdated: string;
  rates: MetalRate[];
  history: HistoryEntry[];
  chartData: {
    '1Y': ChartDataPoint[];
    '3Y': ChartDataPoint[];
    '5Y': ChartDataPoint[];
    '10Y': ChartDataPoint[];
    'ALL': ChartDataPoint[];
  };
}

export interface AllMetalsResponse {
  gold: MetalData;
  silver: MetalData;
  platinum: MetalData;
  lastUpdated: string;
}

export interface UpdatePriceRequest {
  metal: 'gold' | 'silver' | 'platinum';
  rates: {
    purity: string;
    price: number;
  }[];
  apiKey: string;
}
