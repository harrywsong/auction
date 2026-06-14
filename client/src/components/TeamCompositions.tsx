import React from 'react';
import { Captain, Player } from '../types';
import { formatCurrency, getTierStyle } from '../utils/format';

interface TeamCompositionsProps {
  captains: Captain[];
  soldPlayers: Player[];
}

// Tiers split across two rows: row 1 = 1,3,4,5 · row 2 = 6,7,8,9,10
const ROW_ONE = ['1', '3', '4', '5'] as const;
const ROW_TWO = ['6', '7', '8', '9', '10'] as const;

export function TeamCompositions({ captains, soldPlayers }: TeamCompositionsProps) {
  if (captains.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {captains.map((captain) => {
        const teamPlayers = soldPlayers.filter((p) => p.assignedCaptainId === captain.id);
        const byTier: Record<string, Player> = {};
        teamPlayers.forEach((p) => { byTier[p.tier] = p; });

        return (
          <div key={captain.id} className="bg-gray-800 rounded-lg px-2 pt-1.5 pb-2">
            {/* Header */}
            <div className="flex justify-between items-baseline mb-1.5">
              <span className="text-white font-bold text-xs truncate">{captain.name}</span>
              <span className="text-green-400 text-xs font-bold shrink-0 ml-1">
                {formatCurrency(captain.currentPoints)} pts
              </span>
            </div>

            {/* Row 1: Captain slot + tiers 1, 3, 4, 5 */}
            <div className="flex gap-1.5 mb-1.5">
              {/* Captain's own slot */}
              <div className="flex-1 flex flex-col items-center gap-0.5">
                <div className="w-full h-8 rounded flex items-center justify-center font-bold text-white text-xs bg-blue-700 border border-blue-500">
                  ★
                </div>
                <div className="text-center w-full" style={{ minHeight: '2rem' }}>
                  <p className="text-blue-300 text-xs font-semibold truncate leading-tight">{captain.name}</p>
                </div>
              </div>

              {ROW_ONE.map((tier) => {
                const player = byTier[tier];
                return (
                  <div key={tier} className="flex-1 flex flex-col items-center gap-0.5">
                    <div
                      className="w-full h-8 rounded flex items-center justify-center font-bold text-white text-sm"
                      style={player ? getTierStyle(tier) : { backgroundColor: '#d0a0b0', opacity: 0.4 }}
                    >
                      {tier}
                    </div>
                    <div className="text-center w-full" style={{ minHeight: '2rem' }}>
                      {player ? (
                        <>
                          <p className="text-white text-xs font-semibold truncate leading-tight">{player.name}</p>
                          <p className="text-yellow-400 text-xs leading-tight">{formatCurrency(player.pointsSpent)}</p>
                        </>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Row 2: tiers 6–10 (offset by captain slot width to align under 6) */}
            <div className="flex gap-1.5">
              {/* Spacer matching the captain slot so tiers 6–10 start under tier 6 */}
              <div className="flex-1" />

              {ROW_TWO.map((tier) => {
                const player = byTier[tier];
                return (
                  <div key={tier} className="flex-1 flex flex-col items-center gap-0.5">
                    <div
                      className="w-full h-8 rounded flex items-center justify-center font-bold text-white text-sm"
                      style={player ? getTierStyle(tier) : { backgroundColor: '#d0a0b0', opacity: 0.4 }}
                    >
                      {tier}
                    </div>
                    <div className="text-center w-full" style={{ minHeight: '2rem' }}>
                      {player ? (
                        <>
                          <p className="text-white text-xs font-semibold truncate leading-tight">{player.name}</p>
                          <p className="text-yellow-400 text-xs leading-tight">{formatCurrency(player.pointsSpent)}</p>
                        </>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
