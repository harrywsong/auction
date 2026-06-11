import React from 'react';
import { Player } from '../types';
import { getTierStyle } from '../utils/format';

interface PlayerCardProps {
  player: Player | null;
}

export function PlayerCard({ player }: PlayerCardProps) {
  if (!player) {
    return (
      <div className="p-8 bg-gray-800 rounded-lg text-center text-gray-400">
        <p>Waiting for next player...</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-800 rounded-lg">
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-4">
          <span className="px-4 py-2 rounded text-white font-bold text-lg" style={getTierStyle(player.tier)}>
            {player.tier}
          </span>
          <h2 className="text-3xl font-bold text-white">{player.name}</h2>
        </div>
        <div>
          <p className="text-gray-400 text-sm">Roles</p>
          <p className="text-white font-semibold">{player.role || '—'}</p>
        </div>
      </div>
    </div>
  );
}
