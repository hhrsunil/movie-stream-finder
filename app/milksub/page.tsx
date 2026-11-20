'use client';
import React, { useState, useEffect } from 'react';
import { queueMilkLog, getLocalLogs } from '@/lib/db';
import { syncOfflineQueue } from '@/lib/sync';

type LogEntry = {
  qty: number;
  status: 'delivered' | 'leave';
};

export default function MilkSubscriptionPage() {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'month'>('day');
  const [selectedQty, setSelectedQty] = useState<number>(1.5);
  const [logs, setLogs] = useState<Record<string, LogEntry>>({});
  
  // Swipe and Animation State
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | ''>('');
  const [isAnimating, setIsAnimating] = useState(false);

  const quantities = [1, 1.5, 2, 2.5, 3];
  const pricePerLiter = 74;
  const dateKey = currentDate.toLocaleDateString('en-CA'); 

  // Prevent swiping into the future
  const todayDateKey = new Date().toLocaleDateString('en-CA');
  const isToday = dateKey === todayDateKey;

  // --- Load Local Data & Setup Sync ---
  useEffect(() => {
    getLocalLogs().then(savedLogs => setLogs(savedLogs));
    syncOfflineQueue();
    window.addEventListener('online', syncOfflineQueue);
    return () => window.removeEventListener('online', syncOfflineQueue);
  }, []);

  const formattedDay = currentDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const formattedMonth = currentDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const changeDay = (days: number) => {
    if (isAnimating) return; // Prevent double-swipes during animation
    
    // Prevent navigating to tomorrow
    if (days > 0 && isToday) return; 

    setIsAnimating(true);
    setSlideDirection(days > 0 ? 'left' : 'right');

    setTimeout(() => {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + days);
      setCurrentDate(newDate);
      
      // Reset animation states
      setSlideDirection('');
      setIsAnimating(false);
    }, 200); // 200ms matches the CSS transition duration
  };

  // --- Action Handler ---
  const handleAction = async (status: 'delivered' | 'leave') => {
    setLogs(prev => ({ ...prev, [dateKey]: { qty: selectedQty, status } }));
    await queueMilkLog(dateKey, selectedQty, status);
    syncOfflineQueue();
  };

  // --- Mobile Touch Handlers ---
  const minSwipeDistance = 50;
  
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  
  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  
  const onTouchEndEvent = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    
    // Swiped left (trying to go to next day)
    if (distance > minSwipeDistance) {
      if (!isToday) changeDay(1); 
    } 
    // Swiped right (trying to go to previous day)
    if (distance < -minSwipeDistance) {
      changeDay(-1);
    }
  };

  // --- Month View Grid ---
  const renderMonthGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>);
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      const iterDate = new Date(year, month, i);
      const iterKey = iterDate.toLocaleDateString('en-CA');
      const dayLog = logs[iterKey];
      const isFutureDate = iterDate > new Date();
      
      let bgClass = "bg-white border-gray-200 text-gray-700";
      if (dayLog?.status === 'delivered') bgClass = "bg-green-100 border-green-300 text-green-800";
      if (dayLog?.status === 'leave') bgClass = "bg-red-100 border-red-300 text-red-800";
      if (iterKey === dateKey) bgClass += " ring-2 ring-blue-500 font-bold";
      if (isFutureDate) bgClass = "bg-gray-50 border-gray-100 text-gray-300 opacity-50 cursor-not-allowed";

      days.push(
        <button
          key={i}
          disabled={isFutureDate}
          onClick={() => { setCurrentDate(iterDate); setViewMode('day'); }}
          className={`h-12 w-full rounded-lg border flex flex-col items-center justify-center text-sm ${bgClass}`}
        >
          <span>{i}</span>
          {dayLog?.status === 'delivered' && <span className="text-[10px] font-bold">{dayLog.qty}L</span>}
        </button>
      );
    }
    return days;
  };

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8 text-black overflow-hidden">
      <div className="max-w-md mx-auto relative">
        
        {/* Navigation Bar */}
        <div className="flex justify-between items-center mb-4 px-2">
          <button 
            onClick={() => setViewMode(viewMode === 'day' ? 'month' : 'day')}
            className="flex items-center gap-2 text-blue-600 font-medium bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors"
          >
            {viewMode === 'day' ? <><span>📅</span> Month View</> : <><span>⬅</span> Back to Day</>}
          </button>
        </div>

        {viewMode === 'day' ? (
          /* --- DAY VIEW TILE --- */
          <div 
            className={`bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden transform transition-all duration-200 ease-in-out ${
              slideDirection === 'left' ? '-translate-x-full opacity-0' : slideDirection === 'right' ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'
            }`}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEndEvent}
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-gray-50">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Sunil Lavhale</h1>
                <div className="flex items-center gap-3 mt-2">
                  <button onClick={() => changeDay(-1)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 active:bg-gray-300">◀</button>
                  <p className="text-gray-700 font-bold min-w-[130px] text-center select-none">{formattedDay}</p>
                  <button 
                    onClick={() => changeDay(1)} 
                    disabled={isToday}
                    className={`p-2 rounded-full ${isToday ? 'text-gray-200 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-200 active:bg-gray-300'}`}
                  >
                    ▶
                  </button>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-block bg-gray-200 text-gray-500 text-sm font-bold px-3 py-1 rounded-full select-none">₹{pricePerLiter} / L</span>
                <p className="text-xs text-gray-400 mt-1 mr-1 select-none font-semibold">Buffalo Milk</p>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="p-6 relative min-h-[300px]">
              {logs[dateKey] && (
                <div className="absolute top-0 left-0 w-full p-2 bg-blue-50 border-b border-blue-100 text-center text-blue-800 text-sm font-semibold">
                  Logged: {logs[dateKey].status === 'delivered' ? `${logs[dateKey].qty}L Delivered` : 'Leave'}
                </div>
              )}

              <div className="mt-8">
                <h2 className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-wider">Select Quantity</h2>
                <div className="flex flex-wrap gap-2 mb-8">
                  {quantities.map((qty) => (
                    <button
                      key={qty}
                      onClick={() => setSelectedQty(qty)}
                      className={`flex-1 min-w-[55px] py-4 rounded-xl font-bold transition-all active:scale-95 ${
                        selectedQty === qty ? 'bg-blue-600 text-white shadow-md scale-105' : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {qty}
                    </button>
                  ))}
                </div>

                <h2 className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-wider">Status</h2>
                <div className="flex gap-4">
                  <button
                    onClick={() => handleAction('delivered')}
                    className={`flex-1 font-bold py-5 rounded-2xl shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2 ${
                      logs[dateKey]?.status === 'delivered' ? 'bg-green-600 text-white border-4 border-green-200' : 'bg-green-500 hover:bg-green-600 text-white'
                    }`}
                  >
                    <span className="text-2xl">✓</span> Delivered
                  </button>
                  <button
                    onClick={() => handleAction('leave')}
                    className={`flex-1 font-bold py-5 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 ${
                      logs[dateKey]?.status === 'leave' ? 'bg-red-600 text-white border-4 border-red-200' : 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200'
                    }`}
                  >
                    <span className="text-2xl">✗</span> Leave
                  </button>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 text-center py-3 text-xs font-semibold text-gray-400 border-t border-gray-100">
              {isToday ? 'Swipe right for yesterday' : 'Swipe left/right to change day'}
            </div>
          </div>
        ) : (
          /* --- MONTH VIEW --- */
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <button onClick={() => changeDay(-30)} className="p-2 hover:bg-gray-100 rounded-full font-bold">◀</button>
              <h2 className="text-xl font-bold text-gray-900">{formattedMonth}</h2>
              <button 
                onClick={() => changeDay(30)} 
                disabled={currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear()}
                className="p-2 hover:bg-gray-100 rounded-full font-bold disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ▶
              </button>
            </div>
            <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold text-gray-400">
              <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {renderMonthGrid()}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}