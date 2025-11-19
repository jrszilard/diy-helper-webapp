import Link from 'next/link'
import { Wrench, BookOpen, ShoppingCart, Calculator, CheckCircle, ArrowRight, Zap, Shield, Clock, Star, Users, TrendingUp } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-2 rounded-lg">
                <Wrench className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                DIY Helper
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/chat" className="hidden sm:block text-gray-600 hover:text-gray-900 font-medium transition">
                Try Demo
              </Link>
              <Link href="/chat" className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2.5 rounded-lg hover:from-blue-700 hover:to-blue-800 font-semibold transition shadow-md hover:shadow-lg">
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <section className="relative pt-20 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-20"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-100 rounded-full blur-3xl opacity-20"></div>
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-8 shadow-sm">
              <Zap className="w-4 h-4" />
              <span>Powered by Claude AI - Instant Expert Guidance</span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              Stop Googling.
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Start Building.
              </span>
            </h1>

            <p className="text-xl sm:text-2xl text-gray-600 mb-10 leading-relaxed max-w-3xl mx-auto">
              Get instant answers about building codes, materials, and calculations. 
              No more watching 20 YouTube videos or digging through code books.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="/chat" className="group inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-4 rounded-xl hover:from-blue-700 hover:to-blue-800 font-semibold text-lg transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                Try It Free Now
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a href="#demo" className="inline-flex items-center justify-center gap-2 border-2 border-gray-300 bg-white text-gray-700 px-8 py-4 rounded-xl hover:border-gray-400 hover:bg-gray-50 font-semibold text-lg transition shadow-sm hover:shadow">
                Watch Demo
              </a>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-8 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-white text-xs font-bold">A</div>
                  <div className="w-8 h-8 rounded-full bg-green-500 border-2 border-white flex items-center justify-center text-white text-xs font-bold">B</div>
                  <div className="w-8 h-8 rounded-full bg-purple-500 border-2 border-white flex items-center justify-center text-white text-xs font-bold">C</div>
                </div>
                <span className="font-medium">Trusted by DIYers</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <div className="flex text-yellow-400">
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                </div>
                <span className="font-medium">50+ Codes • 40+ Products</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="font-medium">Always Free</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 bg-white border-y">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">50+</div>
              <div className="text-gray-600 font-medium">Building Codes</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-600 mb-2">40+</div>
              <div className="text-gray-600 font-medium">Products Listed</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-purple-600 mb-2">7</div>
              <div className="text-gray-600 font-medium">Smart Calculators</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-orange-600 mb-2">5s</div>
              <div className="text-gray-600 font-medium">Response Time</div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Everything You Need in One Place
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Stop switching between tabs. Get codes, products, and calculations instantly.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="group relative bg-white p-8 rounded-2xl border-2 border-gray-100 hover:border-blue-200 hover:shadow-xl transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity"></div>
              <div className="relative">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 w-14 h-14 rounded-xl flex items-center justify-center mb-5 shadow-lg">
                  <BookOpen className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Building Codes</h3>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Instant access to NEC, IRC, and IPC codes. No more flipping through books or searching forums.
                </p>
                <div className="flex items-center text-blue-600 font-semibold text-sm">
                  <span>50+ codes available</span>
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>

            <div className="group relative bg-white p-8 rounded-2xl border-2 border-gray-100 hover:border-green-200 hover:shadow-xl transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity"></div>
              <div className="relative">
                <div className="bg-gradient-to-br from-green-500 to-green-600 w-14 h-14 rounded-xl flex items-center justify-center mb-5 shadow-lg">
                  <ShoppingCart className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Smart Shopping</h3>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Find the right materials with current pricing. Know exactly what to buy before you go to the store.
                </p>
                <div className="flex items-center text-green-600 font-semibold text-sm">
                  <span>40+ products with pricing</span>
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>

            <div className="group relative bg-white p-8 rounded-2xl border-2 border-gray-100 hover:border-purple-200 hover:shadow-xl transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity"></div>
              <div className="relative">
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 w-14 h-14 rounded-xl flex items-center justify-center mb-5 shadow-lg">
                  <Calculator className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Project Math</h3>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Calculate wire, outlets, tile, paint, and more. Get exact quantities to avoid waste and extra trips.
                </p>
                <div className="flex items-center text-purple-600 font-semibold text-sm">
                  <span>7 specialized calculators</span>
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>

            <div className="group relative bg-white p-8 rounded-2xl border-2 border-gray-100 hover:border-orange-200 hover:shadow-xl transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity"></div>
              <div className="relative">
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 w-14 h-14 rounded-xl flex items-center justify-center mb-5 shadow-lg">
                  <Wrench className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Expert Guidance</h3>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Step-by-step help for your entire project. Like having a contractor in your pocket.
                </p>
                <div className="flex items-center text-orange-600 font-semibold text-sm">
                  <span>Ask anything, anytime</span>
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Get Answers in Seconds
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              No signup required. No credit card. Just instant help for your project.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-lg">
                1
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Ask Your Question</h3>
              <p className="text-gray-600 leading-relaxed">
                Type in plain English. Ask about codes, materials, or how to do something safely.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-lg">
                2
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">AI Searches Everything</h3>
              <p className="text-gray-600 leading-relaxed">
                Claude searches codes, products, and runs calculations. All in under 5 seconds.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-lg">
                3
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Build with Confidence</h3>
              <p className="text-gray-600 leading-relaxed">
                Get code-compliant answers with products and quantities. Ask follow-ups anytime.
              </p>
            </div>
          </div>

          <div className="text-center mt-16">
            <Link href="/chat" className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-10 py-5 rounded-xl hover:from-blue-700 hover:to-blue-800 font-bold text-lg transition shadow-xl">
              Start Your Project Now
              <ArrowRight className="w-6 h-6" />
            </Link>
          </div>
        </div>
      </section>

      <section id="demo" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              See It In Action
            </h2>
            <p className="text-xl text-gray-600">
              Real questions. Real answers. Real fast.
            </p>
          </div>

          <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
            <div className="space-y-6">
              <div className="flex justify-end">
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-2xl rounded-tr-sm px-5 py-3 max-w-[85%]">
                  <p className="text-sm">
                    What size wire for a 20-amp kitchen circuit 35 feet from the panel?
                  </p>
                </div>
              </div>

              <div className="flex justify-start">
                <div className="bg-gray-50 text-gray-900 rounded-2xl rounded-tl-sm px-5 py-4 max-w-[90%] border border-gray-200">
                  <p className="text-sm mb-3">
                    For a 20-amp circuit, you need <strong>12-gauge wire</strong> per NEC 210.19.
                  </p>
                  <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-bold text-sm">Southwire 250ft 12/2 NM-B</div>
                        <div className="text-xs text-gray-600">Copper with Ground</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">$87.43</div>
                        <div className="text-xs text-green-600">In stock</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span>4.7/5 reviews</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 text-center">
              <Link href="/chat" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold">
                Try it yourself
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Ready to Start Your Project?
          </h2>
          <p className="text-xl text-gray-600 mb-10">
            Join DIYers getting instant, code-compliant answers
          </p>
          <Link href="/chat" className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-10 py-5 rounded-xl hover:from-blue-700 hover:to-blue-800 font-bold text-lg transition shadow-xl">
            Start Chatting Free
            <ArrowRight className="w-6 h-6" />
          </Link>
          <p className="mt-6 text-sm text-gray-500">
            No signup • No credit card • Always free
          </p>
        </div>
      </section>

      <footer className="border-t bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Wrench className="w-6 h-6 text-blue-600" />
            <span className="font-bold text-gray-900 text-lg">DIY Helper</span>
          </div>
          <p className="text-gray-600 text-sm mb-6">
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