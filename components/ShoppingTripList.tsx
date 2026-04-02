'use client';

import { useState, useEffect } from 'react';
import { Plus, ClipboardList, Printer, Trash2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import TextInput from '@/components/ui/TextInput';
import { useShoppingTrips } from '@/hooks/useShoppingTrips';

interface ShoppingTripListProps {
  projectId: string;
  projectName: string;
  onOpenChecklist: (tripId: string) => void;
}

export default function ShoppingTripList({ projectId, projectName, onOpenChecklist }: ShoppingTripListProps) {
  const { trips, loading, fetchTrips, createTrip, deleteTrip } = useShoppingTrips(projectId);
  const [showCreate, setShowCreate] = useState(false);
  const [newTripName, setNewTripName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const handleCreate = async () => {
    if (!newTripName.trim()) return;
    setCreating(true);
    const trip = await createTrip(newTripName.trim());
    setCreating(false);
    if (trip) {
      setNewTripName('');
      setShowCreate(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Shopping Trips</h3>
          <p className="text-xs text-earth-brown-light">{projectName}</p>
        </div>
        <Button
          variant="primary"
          size="xs"
          leftIcon={Plus}
          iconSize={14}
          onClick={() => setShowCreate(true)}
        >
          New Trip
        </Button>
      </div>

      {/* Create trip form */}
      {showCreate && (
        <div className="bg-earth-tan/30 border border-earth-sand/30 rounded-lg p-3 space-y-2">
          <TextInput
            value={newTripName}
            onChange={(e) => setNewTripName(e.target.value)}
            placeholder="Trip name (e.g., Plumbing & Fixtures)"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <div className="flex gap-2">
            <Button variant="primary" size="xs" onClick={handleCreate} disabled={creating || !newTripName.trim()}>
              {creating ? 'Creating...' : 'Create & Snapshot Items'}
            </Button>
            <Button variant="ghost" size="xs" onClick={() => { setShowCreate(false); setNewTripName(''); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Trip cards */}
      {loading && trips.length === 0 && (
        <div className="text-sm text-earth-brown-light py-4 text-center">Loading trips...</div>
      )}

      {!loading && trips.length === 0 && !showCreate && (
        <div className="text-sm text-earth-brown-light py-4 text-center">
          No shopping trips yet. Create one to snapshot your current materials list.
        </div>
      )}

      {trips.map((trip) => {
        const progress = trip.total_items > 0 ? Math.round((trip.purchased_items / trip.total_items) * 100) : 0;
        const isCompleted = trip.status === 'completed';

        return (
          <div
            key={trip.id}
            className={`border rounded-xl p-3.5 transition-colors ${
              isCompleted
                ? 'bg-earth-tan/10 border-earth-sand/20 opacity-70'
                : 'bg-white border-earth-sand/30 hover:border-forest-green/30'
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="text-sm font-semibold text-foreground">{trip.name}</div>
                <div className="text-xs text-earth-brown-light mt-0.5">
                  Created {new Date(trip.created_at).toLocaleDateString()}
                </div>
              </div>
              <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${
                isCompleted
                  ? 'bg-[var(--status-complete-bg)] text-forest-green'
                  : 'bg-[var(--status-progress-bg)] text-terracotta'
              }`}>
                {isCompleted ? 'COMPLETED' : 'IN PROGRESS'}
              </span>
            </div>

            {/* Progress bar */}
            <div className="mt-2.5">
              <div className="flex justify-between mb-1">
                <span className="text-xs text-earth-brown-light">
                  {trip.purchased_items} of {trip.total_items} items purchased
                </span>
                <span className={`text-xs font-semibold ${isCompleted ? 'text-forest-green' : 'text-terracotta'}`}>
                  {progress}%
                </span>
              </div>
              <div className="bg-earth-tan/40 rounded h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded transition-all ${isCompleted ? 'bg-forest-green/60' : 'bg-forest-green'}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-2.5">
              <Button variant="ghost" size="xs" leftIcon={ClipboardList} iconSize={14} onClick={() => onOpenChecklist(trip.id)}>
                Open Checklist
              </Button>
              <Button variant="ghost" size="xs" leftIcon={Printer} iconSize={14} onClick={() => onOpenChecklist(trip.id)}>
                Print
              </Button>
              <span className="text-xs text-earth-brown-light flex items-center ml-auto">
                Est. ${trip.total_estimate.toFixed(0)}
              </span>
              <Button variant="ghost" size="xs" leftIcon={Trash2} iconSize={14} onClick={() => deleteTrip(trip.id)} className="text-rust hover:text-rust">
                &nbsp;
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
