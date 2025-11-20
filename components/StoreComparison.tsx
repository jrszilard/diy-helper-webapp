'use client';

interface StoreResult {
  store: string;
  price: string;
  availability: 'in-stock' | 'limited' | 'out-of-stock' | 'online-only';
  distance: string;
  address: string;
  phone: string;
  link: string;
  notes?: string;
}

interface StoreComparisonProps {
  materialName: string;
  results: StoreResult[];
}

export default function StoreComparison({ materialName, results }: StoreComparisonProps) {
  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'in-stock': return 'bg-green-100 text-green-800';
      case 'limited': return 'bg-yellow-100 text-yellow-800';
      case 'out-of-stock': return 'bg-red-100 text-red-800';
      case 'online-only': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Find the best price
  const lowestPrice = Math.min(
    ...results
      .map(r => parseFloat(r.price.replace(/[^0-9.]/g, '')))
      .filter(p => !isNaN(p))
  );
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6 my-4">
      <h3 className="text-xl font-bold mb-4">{materialName} - Store Comparison</h3>
      
      <div className="space-y-4">
        {results.map((result, idx) => {
          const price = parseFloat(result.price.replace(/[^0-9.]/g, ''));
          const isBestPrice = !isNaN(price) && price === lowestPrice;
          
          return (
            <div 
              key={idx}
              className={`border rounded-lg p-4 ${isBestPrice ? 'border-green-500 border-2 bg-green-50' : ''}`}
            >
              {isBestPrice && (
                <div className="text-green-700 font-semibold text-sm mb-2">
                  ⭐ BEST PRICE
                </div>
              )}
              
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="text-lg font-semibold">{result.store}</h4>
                  <p className="text-sm text-gray-600">{result.distance} away</p>
                </div>
                
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">{result.price}</div>
                  <span className={`text-xs px-2 py-1 rounded ${getAvailabilityColor(result.availability)}`}>
                    {result.availability.replace('-', ' ').toUpperCase()}
                  </span>
                </div>
              </div>
              
              <div className="text-sm text-gray-700 mb-3">
                <p>{result.address}</p>
                <p>Phone: {result.phone}</p>
                {result.notes && (
                  <p className="text-gray-600 italic mt-1">{result.notes}</p>
                )}
              </div>
              
              
                <a href={result.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                View Product →
              </a>
            </div>
          );
        })}
      </div>
      
      <div className="mt-6 p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
        <p>💡 <strong>Tip:</strong> Prices and availability are updated frequently. Call ahead to confirm stock before visiting.</p>
      </div>
    </div>
  );
}