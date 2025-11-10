import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-6">
            🛠️ DIY Helper
          </h1>
          <h2 className="text-3xl font-bold mb-6">
            Get Expert DIY Guidance
            <br />
            <span className="text-blue-600">Without Expensive Service Calls</span>
          </h2>
          
          <p className="text-xl text-gray-600 mb-8">
            AI-powered assistance for your home improvement projects.
            Get building code information, material recommendations, and project calculations.
          </p>

          <Link
            href="/chat"
            className="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition"
          >
            Try AI Assistant (Free)
          </Link>

          <div className="mt-16 grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-xl font-bold mb-2">Building Codes</h3>
              <p className="text-gray-600">
                Get accurate NEC, IRC, and IPC code information
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="text-4xl mb-4">🛒</div>
              <h3 className="text-xl font-bold mb-2">Materials</h3>
              <p className="text-gray-600">
                Find products with pricing and availability
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="text-4xl mb-4">🧮</div>
              <h3 className="text-xl font-bold mb-2">Calculators</h3>
              <p className="text-gray-600">
                Calculate wire, outlets, tile, and more
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
