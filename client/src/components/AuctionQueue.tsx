import React from 'react';
import { Player } from '../types';
import { getTierStyle } from '../utils/format';

interface AuctionQueueProps {
  upNext: Player[];
  reserve: Player[];
}

function PlayerRow({ player, index }: { player: Player; index: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-gray-500 text-xs w-5 shrink-0 text-right">{index + 1}.</span>
      <div className="flex items-center gap-2 flex-1 min-w-0 px-2 py-1.5 bg-gray-700 rounded">
        <span className="text-xs px-1.5 py-0.5 rounded text-white font-bold shrink-0" style={getTierStyle(player.tier)}>
          {player.tier}
        </span>
        <div className="min-w-0">
          <p className="text-white text-sm font-semibold truncate">{player.name}</p>
          <p className="text-gray-400 text-xs truncate">{player.riotId}</p>
        </div>
      </div>
    </div>
  );
}

export function AuctionQueue({ upNext, reserve }: AuctionQueueProps) {
  return (
    <div className="h-full flex flex-col gap-3 min-h-0">
      {/* Up Next — grows up to half the column, then scrolls */}
      <div className="flex flex-col min-h-0" style={{ maxHeight: '50%' }}>
        <div className="p-3 bg-gray-800 rounded-lg flex flex-col min-h-0 h-full">
          <h3 className="text-sm font-semibold text-gray-300 mb-2 shrink-0">
            Up Next {upNext.length > 0 && <span className="text-gray-500">({upNext.length})</span>}
          </h3>
          <div className="overflow-y-auto flex-1 space-y-1.5 pr-1 min-h-0">
            {upNext.length === 0 ? (
              <p className="text-gray-500 text-xs text-center py-3">Queue empty</p>
            ) : (
              upNext.map((p, i) => <PlayerRow key={p.id} player={p} index={i} />)
            )}
          </div>
        </div>
      </div>

      {/* Reserve — takes remaining space, scrolls */}
      <div className="flex-1 min-h-0 p-3 bg-gray-800 rounded-lg flex flex-col">
        <h3 className="text-sm font-semibold text-gray-300 mb-2 shrink-0">
          Reserve {reserve.length > 0 && <span className="text-gray-500">({reserve.length})</span>}
        </h3>
        <div className="overflow-y-auto flex-1 space-y-1.5 pr-1 min-h-0">
          {reserve.length === 0 ? (
            <p className="text-gray-500 text-xs text-center py-3">No players in reserve</p>
          ) : (
            reserve.map((p, i) => <PlayerRow key={p.id} player={p} index={i} />)
          )}
        </div>
      </div>
    </div>
  );
}
