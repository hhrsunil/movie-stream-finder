import { openDB, DBSchema, IDBPDatabase } from 'idb';

export const CUSTOMER_ID = 'sunil-lavhale';

export interface DailyLog {
  date_key: string; // YYYY-MM-DD
  customer_id: string;
  qty: number;
  status: 'delivered' | 'leave';
  updated_at: string;
}

export interface MilkSettings {
  customer_id: string;
  price_per_liter: number;
  milk_type: string;
  updated_at: string;
}

export interface SyncQueueItem {
  id?: number;
  table: 'daily_logs' | 'milk_settings';
  payload: DailyLog | MilkSettings;
}

interface MilkSubDB extends DBSchema {
  daily_logs: {
    key: string;
    value: DailyLog;
  };
  milk_settings: {
    key: string;
    value: MilkSettings;
  };
  syncQueue: {
    key: number;
    value: SyncQueueItem;
  };
}

let dbPromise: Promise<IDBPDatabase<MilkSubDB>> | null = null;

function getDB() {
  if (typeof window === 'undefined') return null;
  if (!dbPromise) {
    dbPromise = openDB<MilkSubDB>('milksub-db', 2, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('daily_logs')) {
          db.createObjectStore('daily_logs', { keyPath: 'date_key' });
        }
        if (!db.objectStoreNames.contains('milk_settings')) {
          db.createObjectStore('milk_settings', { keyPath: 'customer_id' });
        }
        if (!db.objectStoreNames.contains('syncQueue')) {
          db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
        }
      },
    });
  }
  return dbPromise;
}

export async function getAllLocalLogs(): Promise<DailyLog[]> {
  const db = await getDB();
  if (!db) return [];
  return db.getAll('daily_logs');
}

export async function saveLocalLog(log: DailyLog): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db.put('daily_logs', log);
  await db.add('syncQueue', { table: 'daily_logs', payload: log });
}

export async function bulkPutLocalLogs(logs: DailyLog[]): Promise<void> {
  const db = await getDB();
  if (!db) return;
  const tx = db.transaction('daily_logs', 'readwrite');
  for (const log of logs) {
    await tx.store.put(log);
  }
  await tx.done;
}

export async function getLocalSettings(): Promise<MilkSettings | undefined> {
  const db = await getDB();
  if (!db) return undefined;
  return db.get('milk_settings', CUSTOMER_ID);
}

export async function saveLocalSettings(settings: MilkSettings): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db.put('milk_settings', settings);
  await db.add('syncQueue', { table: 'milk_settings', payload: settings });
}

export async function putLocalSettingsDirect(settings: MilkSettings): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db.put('milk_settings', settings);
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await getDB();
  if (!db) return [];
  return db.getAll('syncQueue');
}

export async function removeSyncQueueItem(id: number): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db.delete('syncQueue', id);
}