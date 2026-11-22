import { createClient } from '@supabase/supabase-js';
import {
  CUSTOMER_ID,
  DailyLog,
  MilkSettings,
  bulkPutLocalLogs,
  getSyncQueue,
  putLocalSettingsDirect,
  removeSyncQueueItem,
} from './db';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export async function flushSyncQueue(): Promise<void> {
  if (!supabase || typeof navigator === 'undefined' || !navigator.onLine) return;

  const queue = await getSyncQueue();
  for (const item of queue) {
    try {
      if (item.table === 'daily_logs') {
        const log = item.payload as DailyLog;
        const { error } = await supabase
          .from('daily_logs')
          .upsert(log, { onConflict: 'date_key,customer_id' });
        if (!error && item.id !== undefined) {
          await removeSyncQueueItem(item.id);
        }
      } else if (item.table === 'milk_settings') {
        const settings = item.payload as MilkSettings;
        const { error } = await supabase
          .from('milk_settings')
          .upsert(settings, { onConflict: 'customer_id' });
        if (!error && item.id !== undefined) {
          await removeSyncQueueItem(item.id);
        }
      }
    } catch (err) {
      console.error('Sync item failed, will retry later:', err);
    }
  }
}

export async function pullFromSupabase(): Promise<{
  logs: DailyLog[];
  settings: MilkSettings | null;
}> {
  if (!supabase || typeof navigator === 'undefined' || !navigator.onLine) {
    return { logs: [], settings: null };
  }

  let fetchedLogs: DailyLog[] = [];
  let fetchedSettings: MilkSettings | null = null;

  try {
    const { data: logsData, error: logsError } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('customer_id', CUSTOMER_ID);

    if (!logsError && logsData) {
      fetchedLogs = logsData as DailyLog[];
      await bulkPutLocalLogs(fetchedLogs);
    }

    const { data: settingsData, error: settingsError } = await supabase
      .from('milk_settings')
      .select('*')
      .eq('customer_id', CUSTOMER_ID)
      .maybeSingle();

    if (!settingsError && settingsData) {
      fetchedSettings = settingsData as MilkSettings;
      await putLocalSettingsDirect(fetchedSettings);
    }
  } catch (err) {
    console.error('Pull from Supabase failed:', err);
  }

  return { logs: fetchedLogs, settings: fetchedSettings };
}