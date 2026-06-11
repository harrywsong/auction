import React, { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { Bid } from '../types';
import { formatCurrency } from '../utils/format';

export interface ChatMessage {
  id: string;
  senderName: string;
  role: 'admin' | 'captain' | 'spectator' | 'system';
  text: string;
  timestamp: Date;
}

type FeedItem =
  | { kind: 'bid'; data: Bid }
  | { kind: 'chat'; data: ChatMessage };

interface ChatHistoryProps {
  socket: Socket | null;
  auctionId: string | null;
  bids: Bid[];
  senderName: string;
  role: 'admin' | 'captain' | 'spectator' | 'system';
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'text-red-400',
  captain: 'text-blue-400',
  spectator: 'text-gray-400',
  system: 'text-yellow-300',
};

const ROLE_BADGE: Record<string, string> = {
  admin: '👑',
  captain: '⚔️',
  spectator: '👁️',
  system: '🔔',
};

export function ChatHistory({ socket, auctionId, bids, senderName, role }: ChatHistoryProps) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'bids' | 'chat'>('all');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Listen for incoming chat messages
  useEffect(() => {
    if (!socket) return;
    const handler = (msg: ChatMessage) => {
      setChatMessages((prev) => [...prev, { ...msg, timestamp: new Date(msg.timestamp) }]);
    };
    socket.on('chat:message', handler);
    return () => { socket.off('chat:message', handler); };
  }, [socket]);

  // Build combined feed sorted by time, newest at bottom
  const bidItems: FeedItem[] = bids.map((b) => ({ kind: 'bid', data: b }));
  const chatItems: FeedItem[] = chatMessages.map((m) => ({ kind: 'chat', data: m }));
  const allItems: FeedItem[] = [...bidItems, ...chatItems].sort((a, b) => {
    const ta = a.kind === 'bid' ? new Date(a.data.createdAt).getTime() : new Date((a.data as ChatMessage).timestamp).getTime();
    const tb = b.kind === 'bid' ? new Date(b.data.createdAt).getTime() : new Date((b.data as ChatMessage).timestamp).getTime();
    return ta - tb;
  });

  const feed =
    activeTab === 'bids' ? allItems.filter((i) => i.kind === 'bid') :
    activeTab === 'chat' ? allItems.filter((i) => i.kind === 'chat') :
    allItems;

  // Auto-scroll to bottom on new items
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [feed.length]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text || !socket || !auctionId) return;
    socket.emit('chat:send', { auctionId, senderName, role, text });
    setInput('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg flex flex-col h-full min-h-0">
      {/* Tab bar */}
      <div className="flex border-b border-gray-700 shrink-0">
        {(['all', 'bids', 'chat'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-xs font-semibold capitalize transition-colors ${
              activeTab === tab
                ? 'text-white border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab === 'all' ? '📋 All' : tab === 'bids' ? '💰 Bids' : '💬 Chat'}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div ref={scrollRef} className="overflow-y-auto flex-1 px-3 py-2 space-y-1.5">
        {feed.length === 0 ? (
          <p className="text-gray-500 text-xs text-center py-6">Nothing here yet</p>
        ) : (
          feed.map((item) =>
            item.kind === 'bid' ? (
              <div
                key={`bid-${item.data.id}`}
                className="flex items-center justify-between px-2 py-1 bg-gray-700 rounded text-xs"
              >
                <span className="text-yellow-400 mr-1 shrink-0">💰</span>
                <span className="text-blue-300 font-semibold truncate flex-1">{(item.data as Bid).captainName}</span>
                <span className="text-green-400 font-bold ml-2 shrink-0">
                  {formatCurrency((item.data as Bid).amount)}
                </span>
              </div>
            ) : (item.data as ChatMessage).role === 'system' ? (
              <div key={`chat-${(item.data as ChatMessage).id}`} className="px-2 py-1 bg-yellow-900/30 border border-yellow-700/40 rounded text-xs text-yellow-200 font-semibold">
                {(item.data as ChatMessage).text}
              </div>
            ) : (
              <div key={`chat-${(item.data as ChatMessage).id}`} className="text-xs leading-relaxed px-1">
                <span className={`font-semibold ${ROLE_COLORS[(item.data as ChatMessage).role] ?? 'text-gray-300'}`}>
                  {ROLE_BADGE[(item.data as ChatMessage).role]} {(item.data as ChatMessage).senderName}
                </span>
                <span className="text-gray-500 ml-1">
                  {new Date((item.data as ChatMessage).timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-gray-200 ml-1 break-words">{(item.data as ChatMessage).text}</span>
              </div>
            )
          )
        )}
      </div>

      {/* Chat input */}
      <div className="flex gap-1.5 p-2 border-t border-gray-700 shrink-0">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={200}
          placeholder="Say something..."
          className="flex-1 min-w-0 px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-xs placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim()}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded text-xs font-semibold transition-colors shrink-0"
        >
          Send
        </button>
      </div>
    </div>
  );
}
