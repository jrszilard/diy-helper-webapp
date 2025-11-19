import ChatInterface from '@/components/ChatInterface';
import Link from 'next/link';
import { Home, Wrench } from 'lucide-react';

export default function ChatPage() {
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition">
              <Wrench className="w-6 h-6 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">DIY Helper</span>
            </Link>
            
            <Link
              href="/"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
            >
              <Home className="w-5 h-5" />
              <span className="hidden sm:inline font-medium">Home</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        <ChatInterface />
      </div>
    </div>
  );
}
