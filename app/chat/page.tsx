import ChatInterface from '@/components/ChatInterface';

export default function ChatPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            🛠️ DIY Helper
          </h1>
        </div>
      </header>
      <ChatInterface />
    </div>
  );
}