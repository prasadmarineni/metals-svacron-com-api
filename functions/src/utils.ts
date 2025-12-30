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

// IST timezone offset (UTC+5:30)
const IST_OFFSET = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds

// Get current time in IST as Date object (for internal use)
export function getISTDate(): Date {
  const now = new Date();
  return new Date(now.getTime() + IST_OFFSET);
}

// Get current time as ISO string in IST timezone format
export function getISTTimestamp(): string {
  const istDate = getISTDate();
  
  // Format as ISO string with +05:30 timezone
  const year = istDate.getUTCFullYear();
  const month = String(istDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(istDate.getUTCDate()).padStart(2, '0');
  const hours = String(istDate.getUTCHours()).padStart(2, '0');
  const minutes = String(istDate.getUTCMinutes()).padStart(2, '0');
  const seconds = String(istDate.getUTCSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+05:30`;
}

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
  const now = getISTDate();
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

// Format date to YYYY-MM-DD in IST (Indian Standard Time, UTC+5:30)
export function formatDate(date: Date): string {
  // Convert to IST by adding 5 hours 30 minutes
  const istDate = new Date(date.getTime() + IST_OFFSET);
  return istDate.toISOString().split('T')[0];
}

// Get yesterday's date in IST
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
