'use client';

function Pulse({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-[#E8DFD0] rounded ${className}`} />;
}

export function InventorySkeleton() {
  return (
    <div className="p-4 space-y-4">
      {[1, 2, 3].map(group => (
        <div key={group}>
          <div className="flex items-center gap-2 mb-3">
            <Pulse className="w-4 h-4 rounded-full" />
            <Pulse className="h-4 w-24" />
          </div>
          <div className="space-y-2">
            {[1, 2].map(item => (
              <div key={item} className="bg-white border border-[#D4C8B8] rounded-lg p-3 flex items-center justify-between">
                <div className="flex-1 space-y-2">
                  <Pulse className="h-4 w-32" />
                  <div className="flex gap-2">
                    <Pulse className="h-5 w-14 rounded-full" />
                    <Pulse className="h-5 w-16 rounded-full" />
                  </div>
                </div>
                <div className="flex gap-1">
                  <Pulse className="w-8 h-8 rounded-lg" />
                  <Pulse className="w-8 h-8 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ShoppingSearchSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="p-3 rounded-lg border border-[#D4C8B8] bg-white space-y-3">
          <div className="flex justify-between items-start">
            <div className="space-y-2 flex-1">
              <Pulse className="h-4 w-40" />
              <Pulse className="h-3 w-24" />
            </div>
            <div className="text-right space-y-2">
              <Pulse className="h-6 w-16 ml-auto" />
              <Pulse className="h-5 w-20 rounded ml-auto" />
            </div>
          </div>
          <div className="space-y-1">
            <Pulse className="h-3 w-48" />
            <Pulse className="h-3 w-36" />
          </div>
          <Pulse className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}
