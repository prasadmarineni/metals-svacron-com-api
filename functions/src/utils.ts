import * as admin from 'firebase-admin';
import { MetalData, ChartDataPoint, HistoryEntry } from './types';

// Initialize Firebase Admin with database URL and storage bucket
admin.initializeApp({
  databaseURL: 'https://metals-svacron-com-default-rtdb.firebaseio.com',
  storageBucket: 'metals-svacron-com.firebasestorage.app'
});

export const db = admin.database();
export const storage = admin.storage();
export { admin };

// Validate Firebase Auth token
export async function validateAuthToken(token: string): Promise<boolean> {
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    return !!decodedToken;
  } catch (error) {
    console.error('Auth token validation failed:', error);
    return false;
  }
}

// Get user email from token
export async function getUserFromToken(token: string): Promise<string | null> {
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    return decodedToken.email || null;
  } catch (error) {
    return null;
  }
}

// Helper to calculate change percentage
export function calculateChange(current: number, previous: number): { change: number; changePercent: number } {
  const change = current - previous;
  const changePercent = previous > 0 ? (change / previous) * 100 : 0;
  return { change: Number(change.toFixed(2)), changePercent: Number(changePercent.toFixed(2)) };
}

// Generate chart data for different time ranges
export function generateChartData(history: HistoryEntry[]): MetalData['chartData'] {
  const now = new Date();
  const sortedHistory = [...history].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const filterByYears = (years: number): ChartDataPoint[] => {
    const cutoffDate = new Date(now);
    cutoffDate.setFullYear(cutoffDate.getFullYear() - years);
    
    return sortedHistory
      .filter(entry => new Date(entry.date) >= cutoffDate)
      .map(entry => ({
        date: entry.date,
        price: entry.price
      }));
  };

  return {
    '1Y': filterByYears(1),
    '3Y': filterByYears(3),
    '5Y': filterByYears(5),
    '10Y': filterByYears(10),
    'ALL': sortedHistory.map(entry => ({
      date: entry.date,
      price: entry.price
    }))
  };
}

// Format date to YYYY-MM-DD
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Get yesterday's date
export function getYesterdayDate(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return formatDate(yesterday);
}

// Validate API key
export function validateApiKey(apiKey: string): boolean {
  const validKey = process.env.API_KEY || 'metals-api-key-2025';
  return apiKey === validKey;
}
