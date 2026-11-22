'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getLocalDB } from '@/lib/db';
import {
  syncOfflineQueue,
  saveSettingsToSupabase,
  fetchSettingsFromSupabase,
} from '@/lib/sync';

interface DailyLog {
  dateKey: string;
  qty: number;
  status: 'delivered' | 'leave';
}

const QUANTITIES = [1, 1.5, 2, 2.5, 3];
const MILK_TYPES = ['Buffalo Milk', 'Cow Milk'];

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function MilkSubPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [selectedQty, setSelectedQty] = useState<number>(1.5);
  const [logs, setLogs] = useState<Record<string, DailyLog>>({});
  const [showMonthView, setShowMonthView] = useState<boolean>(false);

  // Editable Price & Milk Type state
  const [pricePerLiter, setPricePerLiter] = useState<number>(74);
  const [isEditingPrice, setIsEditingPrice] = useState<boolean>(false);
  const [priceInput, setPriceInput] = useState<string>('74');
  const [milkType, setMilkType] = useState<string>('Buffalo Milk');

  // Monthly Total toggle
  const [showTotalCard, setShowTotalCard] = useState<boolean>(false);

  // Touch swipe tracking
  const touchStartX = useRef<number | null>(null);

  const dateKey = formatDateKey(selectedDate);
  const currentLog = logs[dateKey];

  // Load local logs + settings on mount
  useEffect(() => {
    async function init() {
      // 1. Load settings from localStorage first (instant offline)
      const savedPrice = localStorage.getItem('milksub_price');
      const savedType = localStorage.getItem('milksub_type');
      if (savedPrice) {
        const parsed = parseFloat(savedPrice);
        if (!isNaN(parsed)) {
          setPricePerLiter(parsed);
          setPriceInput(String(parsed));
        }
      }
      if (savedType) {
        setMilkType(savedType);
      }

      // 2. Load logs from IndexedDB
      try {
        const db = await getLocalDB();
        const allLogs: DailyLog[] = await db.getAll('logs');
        const map: Record<string, DailyLog> = {};
        for (const item of allLogs) {
          map[item.dateKey] = item;
        }
        setLogs(map);
      } catch (err) {
        console.error('Error loading local DB:', err);
      }

      // 3. Sync queue & pull latest settings from Supabase
      syncOfflineQueue();
      const remoteSettings = await fetchSettingsFromSupabase();
      if (remoteSettings) {
        setPricePerLiter(remoteSettings.price_per_liter);
        setPriceInput(String(remoteSettings.price_per_liter));
        setMilkType(remoteSettings.milk_type);
        localStorage.setItem('milksub_price', String(remoteSettings.price_per_liter));
        localStorage.setItem('milksub_type', remoteSettings.milk_type);
      }
    }

    init();

    const handleOnline = () => syncOfflineQueue();
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  // Update selected quantity when switching dates
  useEffect(() => {
    if (currentLog && currentLog.status === 'delivered') {
      setSelectedQty(currentLog.qty);
    }
  }, [dateKey, currentLog]);

  const changeDate = (offsetDays: number) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + offsetDays);
    setSelectedDate(next);
  };

  const handleSavePrice = async () => {
    const parsed = parseFloat(priceInput);
    if (!isNaN(parsed) && parsed > 0) {
      setPricePerLiter(parsed);
      localStorage.setItem('milksub_price', String(parsed));
      await saveSettingsToSupabase(parsed, milkType);
    } else {
      setPriceInput(String(pricePerLiter));
    }
    setIsEditingPrice(false);
  };

  const handleMilkTypeChange = async (newType: string) => {
    setMilkType(newType);
    localStorage.setItem('milksub_type', newType);
    await saveSettingsToSupabase(pricePerLiter, newType);
  };

  const handleLogStatus = async (status: 'delivered' | 'leave') => {
    const entry: DailyLog = {
      dateKey,
      qty: status === 'delivered' ? selectedQty : 0,
      status,
    };

    // Instant UI update
    setLogs((prev) => ({ ...prev, [dateKey]: entry }));

    // Save locally + queue for Supabase sync
    try {
      const db = await getLocalDB();
      const tx = db.transaction(['logs', 'syncQueue'], 'readwrite');
      await tx.objectStore('logs').put(entry);
      await tx.objectStore('syncQueue').put(entry);
      await tx.done;

      syncOfflineQueue();
    } catch (err) {
      console.error('Failed to save log:', err);
    }
  };

  // Swipe handlers
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (diff > 50) changeDate(-1); // Swipe right -> yesterday
    if (diff < -50) changeDate(1); // Swipe left -> tomorrow
    touchStartX.current = null;
  };

  // Calculate monthly summary for the currently viewed month
  const currentMonthPrefix = `${selectedDate.getFullYear()}-${String(
    selectedDate.getMonth() + 1
  ).padStart(2, '0')}`;

  const monthLogs = Object.values(logs).filter((log) =>
    log.dateKey.startsWith(currentMonthPrefix)
  );

  const deliveredDays = monthLogs.filter((l) => l.status === 'delivered').length;
  const leaveDays = monthLogs.filter((l) => l.status === 'leave').length;
  const totalLiters = monthLogs.reduce(
    (sum, l) => (l.status === 'delivered' ? sum + Number(l.qty) : sum),
    0
  );
  const totalAmount = totalLiters * pricePerLiter;

  const monthName = selectedDate.toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-8 px-4 text-slate-800">
      {/* Top Month View Toggle */}
      <div className="w-full max-w-md mb-4 flex justify-start">
        <button
          onClick={() => setShowMonthView(!showMonthView)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 text-blue-600 font-medium text-sm hover:bg-blue-100 transition"
        >
          <span>📅</span>
          <span>{showMonthView ? 'Day View' : 'Month View'}</span>
        </button>
      </div>

      {/* Main Card */}
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex justify-between items-start gap-2">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Sunil Lavhale</h1>
            </div>

            {/* Editable Price + Milk Type Dropdown */}
            <div className="flex flex-col items-end gap-1.5">
              {isEditingPrice ? (
                <div className="flex items-center gap-1">
                  <span className="text-sm font-semibold text-slate-600">₹</span>
                  <input
                    type="number"
                    step="0.5"
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSavePrice()}
                    autoFocus
                    className="w-16 px-2 py-1 text-sm font-semibold border border-blue-400 rounded-lg focus:outline-none text-right"
                  />
                  <button
                    onClick={handleSavePrice}
                    className="px-2 py-1 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setPriceInput(String(pricePerLiter));
                    setIsEditingPrice(true);
                  }}
                  title="Tap to edit price per liter"
                  className="px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition flex items-center gap-1"
                >
                  <span>₹{pricePerLiter} / L</span>
                  <span className="text-xs text-slate-400">✎</span>
                </button>
              )}

              <select
                value={milkType}
                onChange={(e) => handleMilkTypeChange(e.target.value)}
                className="text-xs font-medium text-slate-500 bg-transparent border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-400 cursor-pointer"
              >
                {MILK_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date Navigation */}
          <div className="mt-4 flex items-center justify-center gap-6">
            <button
              onClick={() => changeDate(-1)}
              className="p-2 text-slate-500 hover:text-slate-900 transition"
              aria-label="Previous day"
            >
              ◀
            </button>
            <span className="text-base font-semibold text-slate-800 min-w-[160px] text-center">
              {formatDisplayDate(selectedDate)}
            </span>
            <button
              onClick={() => changeDate(1)}
              className="p-2 text-slate-500 hover:text-slate-900 transition"
              aria-label="Next day"
            >
              ▶
            </button>
          </div>
        </div>

        {/* Status Banner */}
        {currentLog && (
          <div
            className={`py-2.5 px-4 text-center text-sm font-semibold ${
              currentLog.status === 'delivered'
                ? 'bg-blue-50 text-blue-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {currentLog.status === 'delivered'
              ? `Logged: ${currentLog.qty}L Delivered`
              : 'Logged: On Leave'}
          </div>
        )}

        {/* Body */}
        {showMonthView ? (
          <div className="p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
              {monthName} Logs
            </h2>
            {monthLogs.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">
                No entries logged for {monthName}.
              </p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {monthLogs
                  .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
                  .map((log) => (
                    <div
                      key={log.dateKey}
                      onClick={() => {
                        const [y, m, d] = log.dateKey.split('-').map(Number);
                        setSelectedDate(new Date(y, m - 1, d));
                        setShowMonthView(false);
                      }}
                      className="flex justify-between items-center p-3 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer transition"
                    >
                      <span className="text-sm font-medium text-slate-700">
                        {log.dateKey}
                      </span>
                      <span
                        className={`text-sm font-semibold ${
                          log.status === 'delivered'
                            ? 'text-green-600'
                            : 'text-red-500'
                        }`}
                      >
                        {log.status === 'delivered' ? `${log.qty} L` : 'Leave'}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Quantity Selector */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Select Quantity
              </p>
              <div className="grid grid-cols-5 gap-2">
                {QUANTITIES.map((qty) => (
                  <button
                    key={qty}
                    onClick={() => setSelectedQty(qty)}
                    className={`py-3 rounded-xl font-bold text-base border transition ${
                      selectedQty === qty
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {qty}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Buttons */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Status
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleLogStatus('delivered')}
                  className="py-4 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-base shadow-sm transition active:scale-95"
                >
                  ✓ Delivered
                </button>
                <button
                  onClick={() => handleLogStatus('leave')}
                  className="py-4 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold text-base transition active:scale-95"
                >
                  ✕ Leave
                </button>
              </div>
            </div>

            {/* Monthly Total Button */}
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowTotalCard(!showTotalCard)}
                className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition active:scale-95"
              >
                {showTotalCard ? 'Hide Monthly Total' : `Total (${monthName})`}
              </button>

              {showTotalCard && (
                <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Milk Type</span>
                    <span className="font-semibold text-slate-800">{milkType}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Delivered Days</span>
                    <span className="font-semibold text-green-700">
                      {deliveredDays} days
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Leave Days</span>
                    <span className="font-semibold text-red-600">
                      {leaveDays} days
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Total Milk Taken</span>
                    <span className="font-semibold text-slate-800">
                      {totalLiters} L
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Rate</span>
                    <span className="font-semibold text-slate-800">
                      ₹{pricePerLiter} / L
                    </span>
                  </div>
                  <div className="pt-2 mt-2 border-t border-slate-200 flex justify-between items-center text-base font-bold text-slate-900">
                    <span>Total Amount</span>
                    <span className="text-blue-600">
                      ₹{totalAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer Hint */}
        <div className="py-3 bg-slate-50 border-t border-slate-100 text-center text-xs text-slate-400">
          Swipe right for yesterday
        </div>
      </div>
    </div>
  );
}