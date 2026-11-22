'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CUSTOMER_ID,
  DailyLog,
  MilkSettings,
  getAllLocalLogs,
  getLocalSettings,
  saveLocalLog,
  saveLocalSettings,
} from '@/lib/db';
import { flushSyncQueue, pullFromSupabase } from '@/lib/sync';

const QUANTITIES = [1, 1.5, 2, 2.5, 3];
const MILK_TYPES = ['Buffalo Milk', 'Cow Milk', 'A2 Milk', 'Toned Milk'];

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
  const [logsMap, setLogsMap] = useState<Record<string, DailyLog>>({});
  const [selectedQty, setSelectedQty] = useState<number>(1.5);
  const [pricePerLiter, setPricePerLiter] = useState<number>(74);
  const [milkType, setMilkType] = useState<string>('Buffalo Milk');
  const [isEditingPrice, setIsEditingPrice] = useState<boolean>(false);
  const [priceInput, setPriceInput] = useState<string>('74');
  const [showMonthlyTotal, setShowMonthlyTotal] = useState<boolean>(false);
  const [showMonthView, setShowMonthView] = useState<boolean>(false);

  const touchStartX = useRef<number | null>(null);

  // Initial load from IndexedDB + sync with Supabase
  useEffect(() => {
    async function init() {
      const localLogs = await getAllLocalLogs();
      const map: Record<string, DailyLog> = {};
      localLogs.forEach((l) => {
        map[l.date_key] = l;
      });
      setLogsMap(map);

      const localSettings = await getLocalSettings();
      if (localSettings) {
        setPricePerLiter(Number(localSettings.price_per_liter));
        setPriceInput(String(localSettings.price_per_liter));
        setMilkType(localSettings.milk_type);
      }

      await flushSyncQueue();
      const { logs: remoteLogs, settings: remoteSettings } = await pullFromSupabase();

      if (remoteLogs.length > 0) {
        const merged: Record<string, DailyLog> = { ...map };
        remoteLogs.forEach((l) => {
          merged[l.date_key] = l;
        });
        setLogsMap(merged);
      }

      if (remoteSettings) {
        setPricePerLiter(Number(remoteSettings.price_per_liter));
        setPriceInput(String(remoteSettings.price_per_liter));
        setMilkType(remoteSettings.milk_type);
      }
    }

    init();

    const handleOnline = () => {
      flushSyncQueue();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const currentDateKey = formatDateKey(selectedDate);
  const currentLog = logsMap[currentDateKey];

  // Sync displayed quantity button when changing dates
  useEffect(() => {
    if (currentLog && currentLog.qty > 0) {
      setSelectedQty(Number(currentLog.qty));
    }
  }, [currentDateKey, currentLog]);

  const changeDateBy = (days: number) => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + days);
      return next;
    });
  };

  const handleStatusClick = async (status: 'delivered' | 'leave') => {
    const newLog: DailyLog = {
      date_key: currentDateKey,
      customer_id: CUSTOMER_ID,
      qty: status === 'delivered' ? selectedQty : 0,
      status,
      updated_at: new Date().toISOString(),
    };

    setLogsMap((prev) => ({
      ...prev,
      [currentDateKey]: newLog,
    }));

    await saveLocalLog(newLog);
    flushSyncQueue();

    // Auto-advance to the next day after brief visual confirmation
    setTimeout(() => {
      changeDateBy(1);
    }, 250);
  };

  const handleSaveSettings = async (newPrice: number, newMilkType: string) => {
    const updated: MilkSettings = {
      customer_id: CUSTOMER_ID,
      price_per_liter: newPrice,
      milk_type: newMilkType,
      updated_at: new Date().toISOString(),
    };
    setPricePerLiter(newPrice);
    setMilkType(newMilkType);
    await saveLocalSettings(updated);
    flushSyncQueue();
  };

  const handlePriceSubmit = () => {
    const parsed = parseFloat(priceInput);
    if (!isNaN(parsed) && parsed > 0) {
      handleSaveSettings(parsed, milkType);
    } else {
      setPriceInput(String(pricePerLiter));
    }
    setIsEditingPrice(false);
  };

  // Monthly calculations + Quantity Breakdown with Dates
  const monthlySummary = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const prefix = `${year}-${month}-`;

    const monthLogs = Object.values(logsMap).filter((l) =>
      l.date_key.startsWith(prefix)
    );

    const deliveredLogs = monthLogs.filter((l) => l.status === 'delivered');
    const leaveDays = monthLogs.filter((l) => l.status === 'leave').length;
    const totalMilk = deliveredLogs.reduce((sum, l) => sum + Number(l.qty), 0);
    const totalAmount = totalMilk * pricePerLiter;

    // Group delivered logs by quantity -> sorted list of day numbers
    const grouped: Record<string, number[]> = {};
    for (const log of deliveredLogs) {
      const key = String(Number(log.qty));
      const dayNum = parseInt(log.date_key.split('-')[2], 10);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(dayNum);
    }

    const qtyBreakdown = Object.entries(grouped)
      .map(([qtyStr, days]) => {
        const qty = Number(qtyStr);
        const sortedDays = days.sort((a, b) => a - b);
        return {
          qty,
          days: sortedDays,
          totalLiters: Number((qty * sortedDays.length).toFixed(2)),
        };
      })
      .sort((a, b) => a.qty - b.qty);

    return {
      deliveredDays: deliveredLogs.length,
      leaveDays,
      totalMilk: Number(totalMilk.toFixed(2)),
      totalAmount: Math.round(totalAmount),
      qtyBreakdown,
    };
  }, [logsMap, selectedDate, pricePerLiter]);

  // Month View calendar days
  const calendarDays = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: Array<{ day: number | null; dateKey?: string }> = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push({ day: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(year, month, d);
      cells.push({ day: d, dateKey: formatDateKey(dt) });
    }
    return cells;
  }, [selectedDate]);

  // Touch swipe handlers
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (diff > 50) {
      changeDateBy(-1); // Swipe right -> yesterday
    } else if (diff < -50) {
      changeDateBy(1); // Swipe left -> tomorrow
    }
    touchStartX.current = null;
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-start py-8 px-4">
      <div className="w-full max-w-md">
        {/* Top Month View Pill */}
        <div className="mb-3 flex justify-start">
          <button
            onClick={() => setShowMonthView((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold hover:bg-blue-100 transition"
          >
            <span>📅</span>
            <span>{showMonthView ? 'Back to Daily View' : 'Month View'}</span>
          </button>
        </div>

        {/* Main Card */}
        <div
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
        >
          {/* Header */}
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-start justify-between gap-2">
              <h1 className="text-xl font-bold text-gray-900">Sunil Lavhale</h1>

              <div className="flex flex-col items-end gap-1.5">
                {isEditingPrice ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={priceInput}
                      onChange={(e) => setPriceInput(e.target.value)}
                      onBlur={handlePriceSubmit}
                      onKeyDown={(e) => e.key === 'Enter' && handlePriceSubmit()}
                      autoFocus
                      className="w-16 px-2 py-0.5 text-xs font-semibold border border-blue-400 rounded-full text-center focus:outline-none"
                    />
                    <button
                      onClick={handlePriceSubmit}
                      className="text-xs font-semibold text-blue-600"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditingPrice(true)}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200 transition"
                  >
                    <span>₹{pricePerLiter} / L</span>
                    <span>✏️</span>
                  </button>
                )}

                <select
                  value={milkType}
                  onChange={(e) => handleSaveSettings(pricePerLiter, e.target.value)}
                  className="text-xs text-gray-600 bg-white border border-gray-200 rounded-full px-2.5 py-1 focus:outline-none focus:border-blue-400"
                >
                  {MILK_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date Navigator */}
            <div className="mt-5 flex items-center justify-center gap-6">
              <button
                onClick={() => changeDateBy(-1)}
                className="p-1.5 text-gray-500 hover:text-gray-900 transition"
                aria-label="Previous day"
              >
                ◀
              </button>
              <span className="text-sm font-bold text-gray-900 min-w-[140px] text-center">
                {formatDisplayDate(selectedDate)}
              </span>
              <button
                onClick={() => changeDateBy(1)}
                className="p-1.5 text-gray-500 hover:text-gray-900 transition"
                aria-label="Next day"
              >
                ▶
              </button>
            </div>
          </div>

          {showMonthView ? (
            /* Month View Grid */
            <div className="p-5">
              <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold text-gray-400 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {calendarDays.map((cell, idx) => {
                  if (!cell.day || !cell.dateKey) {
                    return <div key={idx} className="h-12" />;
                  }
                  const log = logsMap[cell.dateKey];
                  const isSelected = cell.dateKey === currentDateKey;
                  let bgClass = 'bg-gray-50 text-gray-700 border-gray-200';
                  if (log?.status === 'delivered') {
                    bgClass = 'bg-green-50 text-green-800 border-green-300';
                  } else if (log?.status === 'leave') {
                    bgClass = 'bg-red-50 text-red-700 border-red-200';
                  }

                  return (
                    <button
                      key={cell.dateKey}
                      onClick={() => {
                        const [y, m, d] = cell.dateKey!.split('-').map(Number);
                        setSelectedDate(new Date(y, m - 1, d));
                        setShowMonthView(false);
                      }}
                      className={`h-12 rounded-lg border flex flex-col items-center justify-center text-xs transition ${bgClass} ${
                        isSelected ? 'ring-2 ring-blue-500' : ''
                      }`}
                    >
                      <span className="font-bold">{cell.day}</span>
                      {log?.status === 'delivered' && (
                        <span className="text-[10px] font-semibold">{log.qty}L</span>
                      )}
                      {log?.status === 'leave' && (
                        <span className="text-[10px] font-semibold">✕</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Daily View Body */
            <div className="p-5 space-y-5">
              {/* Quantity Selector */}
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">
                  Select Quantity
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {QUANTITIES.map((qty) => {
                    const active = selectedQty === qty;
                    return (
                      <button
                        key={qty}
                        onClick={() => setSelectedQty(qty)}
                        className={`py-2.5 rounded-xl text-sm font-bold border transition ${
                          active
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {qty}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status Buttons */}
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">
                  Status
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleStatusClick('delivered')}
                    className={`py-3.5 rounded-xl text-sm font-bold transition ${
                      currentLog?.status === 'delivered'
                        ? 'bg-green-600 text-white shadow-sm'
                        : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                    }`}
                  >
                    ✓ Delivered
                  </button>
                  <button
                    onClick={() => handleStatusClick('leave')}
                    className={`py-3.5 rounded-xl text-sm font-bold transition ${
                      currentLog?.status === 'leave'
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                    }`}
                  >
                    ✕ Leave
                  </button>
                </div>
              </div>

              {/* Monthly Total Toggle Button */}
              <button
                onClick={() => setShowMonthlyTotal((prev) => !prev)}
                className="w-full py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition"
              >
                {showMonthlyTotal ? 'Hide Monthly Total' : 'Show Monthly Total'}
              </button>

              {/* Monthly Summary Card */}
              {showMonthlyTotal && (
                <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Milk Type</span>
                    <span className="font-bold text-gray-900">{milkType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Delivered Days</span>
                    <span className="font-bold text-green-600">
                      {monthlySummary.deliveredDays} days
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Leave Days</span>
                    <span className="font-bold text-red-600">
                      {monthlySummary.leaveDays} days
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Milk Taken</span>
                    <span className="font-bold text-gray-900">
                      {monthlySummary.totalMilk} L
                    </span>
                  </div>

                  {/* Quantity Breakdown + Exact Dates */}
                  {monthlySummary.qtyBreakdown.length > 0 && (
                    <div className="pt-2 border-t border-gray-200 space-y-1.5">
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                        Quantity Breakdown
                      </p>
                      {monthlySummary.qtyBreakdown.map(({ qty, days, totalLiters }) => (
                        <div
                          key={qty}
                          className="rounded-lg bg-white border border-gray-200 px-2.5 py-1.5 text-xs"
                        >
                          <div className="flex justify-between font-semibold text-gray-800">
                            <span>
                              {qty} L × {days.length}{' '}
                              {days.length === 1 ? 'day' : 'days'}
                            </span>
                            <span>{totalLiters} L</span>
                          </div>
                          <div className="text-[11px] text-gray-500 mt-0.5">
                            Dates: {days.join(', ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between pt-1">
                    <span className="text-gray-500">Rate</span>
                    <span className="font-bold text-gray-900">
                      ₹{pricePerLiter} / L
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-200 text-base">
                    <span className="font-bold text-gray-900">Total Amount</span>
                    <span className="font-bold text-blue-600">
                      ₹{monthlySummary.totalAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer Hint */}
          <div className="py-3 bg-gray-50 border-t border-gray-100 text-center text-xs text-gray-400">
            Swipe right for yesterday
          </div>
        </div>
      </div>
    </main>
  );
}