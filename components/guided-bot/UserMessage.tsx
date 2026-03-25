'use client';

interface UserMessageProps {
  content: string;
}

export default function UserMessage({ content }: UserMessageProps) {
  return (
    <div className="flex justify-end">
      <div className="bg-terracotta text-white rounded-2xl rounded-br-md px-4 py-3">
        <p className="text-sm leading-relaxed">{content}</p>
      </div>
    </div>
  );
}
