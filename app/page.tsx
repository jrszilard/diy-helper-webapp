import Link from 'next/link'
import { Wrench, MessageSquare, ArrowRight, Sparkles, CheckCircle } from 'lucide-react'

export default function LandingPage() {
  const examplePrompts = [
    "How do I install a ceiling fan safely?",
    "What's the right wood stain for outdoor furniture?",
    "Calculate materials for tiling my bathroom",
    "Which outlet should I use for a home office?"
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-blue-50/30 to-white">
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-2 rounded-lg">
                <Wrench className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">
                DIY Helper
              </span>
            </div>
            <Link href="/chat" className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 font-medium transition">
              Start Chat
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative pt-16 sm:pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              <span>Powered by Claude AI</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Your AI Assistant for
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                DIY Projects
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              Get instant help with building codes, material recommendations, and project calculations.
              Just ask—no searching required.
            </p>

            <Link href="/chat" className="group inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-xl hover:bg-blue-700 font-semibold text-lg transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
              Start Your Project
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>

            <p className="mt-4 text-sm text-gray-500">
              Free to use • No signup required
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 sm:p-8 mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-blue-100 p-2 rounded-lg">
                <MessageSquare className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Try asking...</h3>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {examplePrompts.map((prompt, index) => (
                <Link
                  key={index}
                  href="/chat"
                  className="group text-left p-4 rounded-xl border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all"
                >
                  <p className="text-sm text-gray-700 group-hover:text-blue-700 font-medium">
                    {prompt}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Everything you need in one chat
            </h2>
            <p className="text-lg text-gray-600">
              No more jumping between websites and forums
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-600 text-white w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold mx-auto mb-4">
                📖
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Building Codes</h3>
              <p className="text-gray-600 text-sm">
                NEC, IRC, and IPC codes at your fingertips
              </p>
            </div>

            <div className="text-center">
              <div className="bg-green-600 text-white w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold mx-auto mb-4">
                🛒
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Product Finder</h3>
              <p className="text-gray-600 text-sm">
                Find the right materials with pricing
              </p>
            </div>

            <div className="text-center">
              <div className="bg-purple-600 text-white w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold mx-auto mb-4">
                🧮
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Smart Calculator</h3>
              <p className="text-gray-600 text-sm">
                Calculate materials and measurements
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              See it in action
            </h2>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-200">
            <div className="space-y-4">
              <div className="flex justify-end">
                <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%]">
                  <p className="text-sm">
                    What size wire for a 20-amp kitchen circuit 35 feet from the panel?
                  </p>
                </div>
              </div>

              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-900 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
                  <p className="text-sm mb-3">
                    For a 20-amp circuit, you need <strong>12-gauge wire</strong> per NEC 210.19.
                  </p>
                  <div className="bg-white rounded-lg p-3 border border-gray-200 text-sm">
                    <div className="font-semibold">Southwire 250ft 12/2 NM-B</div>
                    <div className="text-xs text-gray-600 mt-1">Copper with Ground • $87.43 • In stock</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 text-center">
              <Link href="/chat" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold text-sm">
                Try it yourself
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-600 to-blue-700 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to start your project?
          </h2>
          <p className="text-lg text-blue-100 mb-8">
            Get expert guidance for your DIY project right now
          </p>
          <Link href="/chat" className="inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-xl hover:bg-blue-50 font-bold text-lg transition shadow-lg">
            Start Chatting
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div className="flex items-center justify-center gap-6 mt-8 text-sm text-blue-100">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>Always free</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>No signup</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>Instant answers</span>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t bg-white py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Wrench className="w-5 h-5 text-blue-600" />
            <span className="font-bold text-gray-900">DIY Helper</span>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            AI-powered guidance for your home improvement projects
          </p>
          <p className="text-gray-500 text-xs">
            © 2024 DIY Helper. Built for DIYers, by DIYers.
          </p>
        </div>
      </footer>
    </div>
  )
}