'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Calendar, Clock, DollarSign, Video, CheckCircle } from 'lucide-react';

interface AvailabilitySlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  timezone: string;
  durationMinutes: number;
  priceCents: number;
  platformFeeCents: number;
  expertPayoutCents: number;
}

interface ConsultationBookingProps {
  expertId: string;
  expertName: string;
  reportId?: string;
  projectId?: string;
  qaQuestionId?: string;
  onBooked?: (consultationId: string) => void;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function ConsultationBooking({
  expertId,
  expertName,
  reportId,
  projectId,
  qaQuestionId,
  onBooked,
}: ConsultationBookingProps) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selection state
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [notes, setNotes] = useState('');

  const fetchAvailability = useCallback(async () => {
    try {
      const res = await fetch(`/api/experts/${expertId}/availability`);
      if (res.ok) {
        const data = await res.json();
        setSlots(data.slots || []);
      }
    } catch {
      setError('Failed to load availability');
    } finally {
      setLoading(false);
    }
  }, [expertId]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  // Generate next available dates for a given day_of_week
  function getNextDates(dayOfWeek: number, count: number = 4): string[] {
    const dates: string[] = [];
    const today = new Date();
    const current = new Date(today);
    // Move to next occurrence of dayOfWeek
    current.setDate(current.getDate() + ((dayOfWeek - current.getDay() + 7) % 7 || 7));

    for (let i = 0; i < count; i++) {
      dates.push(new Date(current).toISOString().split('T')[0]);
      current.setDate(current.getDate() + 7);
    }
    return dates;
  }

  const handleBook = async () => {
    if (!selectedSlot || !selectedDate) return;

    setBooking(true);
    setError(null);

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        setError('Please sign in to book a consultation');
        setBooking(false);
        return;
      }

      // Build the scheduled start datetime
      const scheduledStart = `${selectedDate}T${selectedSlot.startTime}`;

      const res = await fetch('/api/consultations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expertId,
          scheduledStart,
          durationMinutes: selectedSlot.durationMinutes,
          timezone: selectedSlot.timezone,
          notes: notes || undefined,
          reportId,
          projectId,
          qaQuestionId,
          // These would come from stored payment method — placeholder
          paymentMethodId: 'pm_placeholder',
          stripeCustomerId: 'cus_placeholder',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setBooked(true);
        if (onBooked) onBooked(data.consultationId);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to book consultation');
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={20} className="animate-spin text-[#5D7B93]" />
      </div>
    );
  }

  if (booked) {
    return (
      <div className="bg-[#4A7C59]/10 border border-[#4A7C59]/30 rounded-lg p-6 text-center">
        <CheckCircle size={32} className="text-[#4A7C59] mx-auto mb-2" />
        <h3 className="text-lg font-bold text-[#3E2723]">Consultation Booked!</h3>
        <p className="text-sm text-[#7D6B5D] mt-1">
          Your {selectedSlot?.durationMinutes}-minute session with {expertName} is confirmed.
        </p>
        <p className="text-sm text-[#5D7B93] mt-2">
          {selectedDate && new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at {selectedSlot?.startTime}
        </p>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="bg-white border border-[#D4C8B8] rounded-lg p-6 text-center">
        <Calendar size={24} className="text-[#B0A696] mx-auto mb-2" />
        <p className="text-sm text-[#7D6B5D]">{expertName} hasn&apos;t set up availability yet.</p>
        <p className="text-xs text-[#B0A696] mt-1">Try sending them a message to schedule directly.</p>
      </div>
    );
  }

  // Group slots by day
  const slotsByDay = slots.reduce<Record<number, AvailabilitySlot[]>>((acc, slot) => {
    if (!acc[slot.dayOfWeek]) acc[slot.dayOfWeek] = [];
    acc[slot.dayOfWeek].push(slot);
    return acc;
  }, {});

  return (
    <div className="bg-white border border-[#D4C8B8] rounded-lg p-5">
      <h3 className="text-sm font-bold text-[#3E2723] mb-4 flex items-center gap-2">
        <Video size={16} className="text-[#5D7B93]" />
        Book a Consultation with {expertName}
      </h3>

      {/* Step 1: Select a time slot */}
      <div className="space-y-3 mb-4">
        {Object.entries(slotsByDay).map(([day, daySlots]) => (
          <div key={day}>
            <p className="text-xs font-semibold text-[#7D6B5D] mb-1">{DAY_NAMES[parseInt(day)]}</p>
            <div className="flex flex-wrap gap-2">
              {daySlots.map(slot => (
                <button
                  key={slot.id}
                  onClick={() => {
                    setSelectedSlot(slot);
                    setSelectedDate('');
                  }}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    selectedSlot?.id === slot.id
                      ? 'border-[#5D7B93] bg-[#5D7B93]/10 text-[#5D7B93]'
                      : 'border-[#D4C8B8] text-[#3E2723] hover:bg-[#F5F0E6]'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} />
                    {slot.startTime.slice(0, 5)} - {slot.endTime.slice(0, 5)}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 text-[10px] text-[#7D6B5D]">
                    <span>{slot.durationMinutes}min</span>
                    <DollarSign size={10} />
                    <span>${(slot.priceCents / 100).toFixed(0)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Step 2: Select a date */}
      {selectedSlot && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-[#7D6B5D] mb-2">Choose a date</p>
          <div className="flex flex-wrap gap-2">
            {getNextDates(selectedSlot.dayOfWeek).map(date => (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                  selectedDate === date
                    ? 'border-[#5D7B93] bg-[#5D7B93]/10 text-[#5D7B93]'
                    : 'border-[#D4C8B8] text-[#3E2723] hover:bg-[#F5F0E6]'
                }`}
              >
                {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Notes + Confirm */}
      {selectedSlot && selectedDate && (
        <div className="space-y-3 border-t border-[#D4C8B8] pt-4">
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Optional: describe what you'd like to discuss..."
            rows={3}
            className="w-full px-3 py-2 border border-[#D4C8B8] rounded-lg text-sm text-[#3E2723] bg-white focus:outline-none focus:ring-2 focus:ring-[#5D7B93]/50 resize-none"
            maxLength={2000}
          />

          {/* Price summary */}
          <div className="bg-[#F5F0E6] rounded-lg p-3 text-xs">
            <div className="flex justify-between">
              <span className="text-[#7D6B5D]">{selectedSlot.durationMinutes}-minute consultation</span>
              <span className="font-semibold text-[#3E2723]">${(selectedSlot.priceCents / 100).toFixed(2)}</span>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}

          <button
            onClick={handleBook}
            disabled={booking}
            className="w-full px-4 py-2.5 bg-[#5D7B93] text-white text-sm font-semibold rounded-lg hover:bg-[#4A6578] transition-colors disabled:opacity-50"
          >
            {booking ? (
              <Loader2 size={16} className="animate-spin mx-auto" />
            ) : (
              `Book for $${(selectedSlot.priceCents / 100).toFixed(0)}`
            )}
          </button>
        </div>
      )}
    </div>
  );
}
