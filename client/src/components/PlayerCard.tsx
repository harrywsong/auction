import React, { useState } from 'react';
import { Player } from '../types';
import { getTierStyle } from '../utils/format';

interface PlayerCardProps {
  player: Player | null;
}

// Profile pictures are served by the server with case-insensitive lookup
// GET http://localhost:4001/pfp/<name>
function getProfilePicUrl(name: string): string {
  return `${import.meta.env.VITE_API_URL || 'http://localhost:4001'}/pfp/${encodeURIComponent(name.trim())}`;
}

export function PlayerCard({ player }: PlayerCardProps) {
  const [imgError, setImgError] = useState(false);

  React.useEffect(() => { setImgError(false); }, [player?.name]);

  if (!player) {
    return (
      <div className="p-8 bg-gray-800 rounded-lg text-center text-gray-400">
        <p>Waiting for next player...</p>
      </div>
    );
  }

  const pfpUrl = getProfilePicUrl(player.name);

  return (
    <div className="bg-gray-800 rounded-lg px-4 py-3 flex items-center gap-4">
      {/* Profile picture */}
      <div className="shrink-0 w-20 h-20 rounded overflow-hidden bg-gray-700 border border-gray-600 flex items-center justify-center">
        {!imgError ? (
          <img
            src={pfpUrl}
            alt={player.riotId}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="text-gray-500 text-xs text-center px-1">pfp</span>
        )}
      </div>

      {/* Left column: name, discord, role */}
      <div className="flex-1 min-w-0 space-y-0.5">
        {/* 인게임 이름 */}
        <p className="text-white font-bold text-xl leading-tight truncate">{player.name}</p>
        {/* 디코 이름 */}
        <p className="text-gray-400 text-sm leading-tight truncate">{player.riotId}</p>
        {/* 요원풀 */}
        {player.role && (
          <p className="text-gray-300 text-xs leading-tight">
            <span className="text-gray-500 mr-1">요원: </span>
            {player.role}
          </p>
        )}
      </div>

      {/* Right column: peak tier, current tier, auction tier */}
      <div className="shrink-0 space-y-1 text-right">
        <div className="text-sm text-gray-300">
          <span className="text-gray-500 mr-1">최고티어 :</span>
          <span className="text-white font-semibold">{player.peakTier || '—'}</span>
        </div>
        <div className="text-sm text-gray-300">
          <span className="text-gray-500 mr-1">현재티어 :</span>
          <span className="text-white font-semibold">{player.currentTier || '—'}</span>
        </div>
        <div className="mt-1">
          <span
            className="px-2.5 py-1 rounded text-white font-bold text-sm"
            style={getTierStyle(player.tier)}
          >
            Tier {player.tier}
          </span>
        </div>
      </div>
    </div>
  );
}
