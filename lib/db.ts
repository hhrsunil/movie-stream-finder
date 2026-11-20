import { openDB } from 'idb';

// Initialize the local database on the phone
export async function getLocalDB() {
  return openDB('MilkTrackerDB', 1, {
    upgrade(db) {
      // Store 1: The actual saved logs for quick viewing on the UI
      if (!db.objectStoreNames.contains('logs')) {
        db.createObjectStore('logs', { keyPath: 'dateKey' });
      }
      // Store 2: The Outbox Queue (stuff waiting to be sent to Supabase)
      if (!db.objectStoreNames.contains('syncQueue')) {
        db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
      }
    },
  });
}

// Function to save a daily entry locally and queue it for sync
export async function queueMilkLog(dateKey: string, qty: number, status: string) {
  const db = await getLocalDB();
  const payload = { dateKey, qty, status };
  
  // 1. Save it locally immediately so the UI updates instantly
  await db.put('logs', payload);
  
  // 2. Put it in the outbox queue to be sent to Supabase later
  await db.put('syncQueue', { 
    action: 'UPSERT_LOG', 
    payload, 
    timestamp: Date.now() 
  });
}

// Function to load all local logs when the app opens
export async function getLocalLogs() {
  const db = await getLocalDB();
  const allLogs = await db.getAll('logs');
  
  // Convert array to a keyed object (e.g., { "2026-11-15": { qty: 1.5, status: "delivered" } })
  const logMap: Record<string, { qty: number, status: 'delivered' | 'leave' }> = {};
  allLogs.forEach(log => {
    logMap[log.dateKey] = { qty: log.qty, status: log.status };
  });
  
  return logMap;
}