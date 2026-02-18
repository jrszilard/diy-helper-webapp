'use client';

interface UserMessageProps {
  content: string;
}

export default function UserMessage({ content }: UserMessageProps) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] sm:max-w-[75%] bg-[#C67B5C] text-white rounded-2xl rounded-br-md px-4 py-3 shadow-sm">
        <p className="text-sm leading-relaxed">{content}</p>
      </div>
    </div>
  );
}
