import { getLocalDB } from './db';
import { createClient } from '@supabase/supabase-js';

// We initialize this lazily inside the function to prevent crashing on load
let supabase: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (supabase) return supabase;
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.warn("Supabase keys are missing. Sync will be paused.");
    return null;
  }
  
  supabase = createClient(supabaseUrl, supabaseKey);
  return supabase;
}

export async function syncOfflineQueue() {
  if (typeof window !== 'undefined' && !navigator.onLine) return; 

  const db = await getLocalDB();
  const tx = db.transaction('syncQueue', 'readonly');
  const queue = await tx.objectStore('syncQueue').getAll();

  if (queue.length === 0) return;

  const client = getSupabaseClient();
  if (!client) return; // Exit if keys are missing

  for (const item of queue) {
    try {
      if (item.action === 'UPSERT_LOG') {
        const { error } = await client.from('daily_logs').upsert({
          date_key: item.payload.dateKey,
          customer_id: 'sunil-lavhale',
          qty: item.payload.qty,
          status: item.payload.status
        }, { onConflict: 'date_key' });
        
        if (!error) {
          const deleteTx = db.transaction('syncQueue', 'readwrite');
          await deleteTx.objectStore('syncQueue').delete(item.id);
        }
      }
    } catch (err) {
      console.error("Sync failed for item", item.id, err);
    }
  }
}