import React from 'react';
import { Captain } from '../types';
import { formatCurrency } from '../utils/format';

interface CurrentBidProps {
  currentBid: number;
  currentLeader: Captain | null;
}

export function CurrentBid({ currentBid, currentLeader }: CurrentBidProps) {
  return (
    <div className="p-6 bg-gray-800 rounded-lg border border-gray-600">
      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="text-sm text-gray-400 uppercase tracking-wide">Current Bid</p>
          <p className="text-4xl font-bold text-white mt-2">
            {formatCurrency(currentBid)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-400 uppercase tracking-wide">Leader</p>
          <p className="text-2xl font-bold text-green-400 mt-2">
            {currentLeader?.name || 'No bids yet'}
          </p>
          {currentLeader && (
            <p className="text-sm text-gray-400 mt-1">
              Points left: {formatCurrency(currentLeader.currentPoints)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
