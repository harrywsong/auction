import React, { useState } from 'react';
import { Captain } from '../types';
import { formatCurrency } from '../utils/format';

interface BiddingPanelProps {
  captain: Captain | null;
  currentBid: number;
  onBidSubmit: (amount: number) => void;
  isDisabled?: boolean;
  bidIncrement: number;
  captainTiers?: string[];   // tiers already on this captain's team
  currentPlayerTier?: string; // tier of the player currently on the block
}

export function BiddingPanel({
  captain,
  currentBid,
  onBidSubmit,
  isDisabled = false,
  bidIncrement,
  captainTiers = [],
  currentPlayerTier,
}: BiddingPanelProps) {
  const [customAmount, setCustomAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!captain) {
    return (
      <div className="p-4 bg-gray-800 rounded text-center text-gray-300">
        <p>Waiting for captain info...</p>
      </div>
    );
  }

  const remainingPoints = captain.currentPoints;
  const nextIncrements = [bidIncrement, bidIncrement * 2, bidIncrement * 5, bidIncrement * 10, bidIncrement * 20];

  // Block bidding if this captain already has this tier
  const hasTier = currentPlayerTier ? captainTiers.includes(currentPlayerTier) : false;
  const tierBlockMessage = hasTier ? `Already have Tier ${currentPlayerTier}` : null;
  const effectivelyDisabled = isDisabled || hasTier;

  const submit = (amount: number) => {
    if (effectivelyDisabled || isSubmitting) return;
    if (isNaN(amount) || amount <= currentBid || amount > remainingPoints) return;
    setIsSubmitting(true);
    onBidSubmit(amount);
    setCustomAmount('');
    setTimeout(() => setIsSubmitting(false), 500);
  };

  const handlePresetBid = (increment: number) => {
    submit(currentBid + increment);
  };

  const handleCustomBid = () => {
    submit(parseInt(customAmount, 10));
  };

  const customParsed = parseInt(customAmount, 10);
  const customValid =
    !isNaN(customParsed) &&
    customParsed > currentBid &&
    customParsed <= remainingPoints;

  return (
    <div className="p-4 bg-gray-800 rounded-lg space-y-3">
      {tierBlockMessage && (
        <div className="px-3 py-2 bg-red-900 border border-red-700 rounded text-red-300 text-xs font-semibold text-center">
          🚫 {tierBlockMessage} — you cannot bid on this player
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-700 p-3 rounded">
          <div className="text-xs text-gray-400">Current Bid</div>
          <div className="text-2xl font-bold text-white">{formatCurrency(currentBid)}</div>
        </div>
        <div className="bg-gray-700 p-3 rounded">
          <div className="text-xs text-gray-400">Your Points</div>
          <div className="text-2xl font-bold text-green-400">{formatCurrency(remainingPoints)}</div>
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs text-gray-400">Quick Bid</p>
        <div className="grid grid-cols-5 gap-1.5">
          {nextIncrements.map((increment) => {
            const newAmount = currentBid + increment;
            const canAfford = newAmount <= remainingPoints;
            return (
              <button
                key={increment}
                onClick={() => handlePresetBid(increment)}
                disabled={effectivelyDisabled || !canAfford || isSubmitting}
                className={`py-1.5 rounded font-semibold text-xs transition-all ${
                  canAfford && !effectivelyDisabled
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
                }`}
              >
                +{increment}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs text-gray-400">Custom Bid</p>
        <div className="flex gap-2">
          <input
            type="number"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCustomBid()}
            placeholder="Enter amount"
            min={currentBid + 1}
            max={remainingPoints}
            disabled={effectivelyDisabled}
            className="flex-1 min-w-0 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm disabled:opacity-50"
          />
          <button
            onClick={handleCustomBid}
            disabled={effectivelyDisabled || !customValid || isSubmitting}
            className={`px-4 py-2 rounded font-semibold text-sm transition-all shrink-0 ${
              customValid && !effectivelyDisabled && !isSubmitting
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
            }`}
          >
            Bid
          </button>
        </div>
      </div>
    </div>
  );
}
