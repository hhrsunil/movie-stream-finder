import { getLocalDB } from './db';
import { createClient } from '@supabase/supabase-js';

let supabase: ReturnType<typeof createClient> | any = null;

function getSupabaseClient() {
  if (supabase) return supabase;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase keys are missing. Sync will be paused.');
    return null;
  }

  supabase = createClient<any>(supabaseUrl, supabaseKey);
  return supabase;
}

export async function syncOfflineQueue() {
  if (typeof window !== 'undefined' && !navigator.onLine) return;

  const db = await getLocalDB();
  const tx = db.transaction('syncQueue', 'readonly');
  const queue = await tx.objectStore('syncQueue').getAll();

  if (queue.length === 0) return;

  const client = getSupabaseClient();
  if (!client) return;

  for (const item of queue) {
    try {
      const { error } = await client.from('daily_logs').upsert(
        {
          date_key: item.dateKey,
          customer_id: 'sunil-lavhale',
          qty: item.qty,
          status: item.status,
        },
        { onConflict: 'date_key' }
      );

      if (!error) {
        const delTx = db.transaction('syncQueue', 'readwrite');
        await delTx.objectStore('syncQueue').delete(item.dateKey);
        await delTx.done;
      }
    } catch (err) {
      console.error('Sync failed for', item.dateKey, err);
    }
  }
}

export async function saveSettingsToSupabase(
  pricePerLiter: number,
  milkType: string
) {
  if (typeof window !== 'undefined' && !navigator.onLine) return;

  const client = getSupabaseClient();
  if (!client) return;

  try {
    await client.from('milk_settings').upsert(
      {
        customer_id: 'sunil-lavhale',
        price_per_liter: pricePerLiter,
        milk_type: milkType,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'customer_id' }
    );
  } catch (err) {
    console.error('Failed to save settings to Supabase:', err);
  }
}

export async function fetchSettingsFromSupabase(): Promise<{
  price_per_liter: number;
  milk_type: string;
} | null> {
  if (typeof window !== 'undefined' && !navigator.onLine) return null;

  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('milk_settings')
      .select('price_per_liter, milk_type')
      .eq('customer_id', 'sunil-lavhale')
      .single();

    if (error || !data) return null;
    return {
      price_per_liter: Number(data.price_per_liter),
      milk_type: String(data.milk_type),
    };
  } catch {
    return null;
  }
}