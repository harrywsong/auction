import React, { useState } from 'react';
import { Player } from '../types';
import { TIERS } from '../config';
import { formatCurrency, getTierStyle } from '../utils/format';

interface PlayerListProps {
  players: Player[];
  onAddPlayer: (name: string, riotId: string, tier: string) => Promise<void>;
  onBulkImport: (csv: string) => Promise<void>;
}

export function PlayerList({ players, onAddPlayer, onBulkImport }: PlayerListProps) {
  const [name, setName] = useState('');
  const [riotId, setRiotId] = useState('');
  const [tier, setTier] = useState('A');
  const [csvInput, setCsvInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);

  const handleAdd = async () => {
    if (name && riotId && tier) {
      setIsAdding(true);
      try {
        await onAddPlayer(name, riotId, tier);
        setName('');
        setRiotId('');
        setTier('A');
      } finally {
        setIsAdding(false);
      }
    }
  };

  const handleBulkImport = async () => {
    if (csvInput) {
      setIsAdding(true);
      try {
        await onBulkImport(csvInput);
        setCsvInput('');
        setShowBulkImport(false);
      } finally {
        setIsAdding(false);
      }
    }
  };

  return (
    <div className="p-6 bg-gray-800 rounded-lg space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-white">Players ({players.length})</h3>
        <button
          onClick={() => setShowBulkImport(!showBulkImport)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-semibold text-sm"
        >
          {showBulkImport ? 'Single Add' : 'Bulk Import'}
        </button>
      </div>

      {showBulkImport ? (
        <div className="space-y-2">
          <textarea
            value={csvInput}
            onChange={(e) => setCsvInput(e.target.value)}
            placeholder="Name,Roles,Tier&#10;Player1,Top/Mid/ADC,A&#10;Player2,Jungle/Support,B"
            className="w-full h-32 px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 font-mono text-sm"
          />
          <button
            onClick={handleBulkImport}
            disabled={!csvInput || isAdding}
            className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded font-semibold"
          >
            {isAdding ? 'Importing...' : 'Import Players'}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Player name"
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500"
          />
          <input
            type="text"
            value={riotId}
            onChange={(e) => setRiotId(e.target.value)}
            placeholder="Top/Mid/ADC (top 3 roles)"
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500"
          />
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white"
          >
            {TIERS.map((t) => (
              <option key={t} value={t}>
                Tier {t}
              </option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            disabled={!name || isAdding}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded font-semibold"
          >
            {isAdding ? 'Adding...' : 'Add Player'}
          </button>
        </div>
      )}

      <div className="max-h-64 overflow-y-auto space-y-2">
        {players.map((player) => (
          <div
            key={player.id}
            className="flex justify-between items-center p-3 bg-gray-700 rounded"
          >
            <div className="flex items-center gap-3">
              <span className="px-2 py-1 rounded text-white text-sm font-bold" style={getTierStyle(player.tier)}>
                {player.tier}
              </span>
              <div>
                <p className="text-white font-semibold">{player.name}</p>
                <p className="text-gray-400 text-sm">{player.role || player.riotId}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
