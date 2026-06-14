import React, { useState } from 'react';
import { Player } from '../types';
import { TIERS } from '../config';
import { getTierStyle } from '../utils/format';

interface PlayerListProps {
  players: Player[];
  onAddPlayer: (name: string, riotId: string, tier: string, peakTier: string, currentTier: string, role: string) => Promise<void>;
  onBulkImport: (csv: string) => Promise<void>;
}

export function PlayerList({ players, onAddPlayer, onBulkImport }: PlayerListProps) {
  const [name, setName] = useState('');
  const [riotId, setRiotId] = useState('');
  const [peakTier, setPeakTier] = useState('');
  const [currentTier, setCurrentTier] = useState('');
  const [role, setRole] = useState('');
  const [tier, setTier] = useState('1');
  const [csvInput, setCsvInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);

  const handleAdd = async () => {
    if (name && riotId && tier) {
      setIsAdding(true);
      try {
        await onAddPlayer(name, riotId, tier, peakTier, currentTier, role);
        setName('');
        setRiotId('');
        setPeakTier('');
        setCurrentTier('');
        setRole('');
        setTier('1');
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
          <p className="text-xs text-gray-400">
            Format: <span className="font-mono text-gray-300">이름, 디코명, 최고티어, 현티어, 요원풀, 경매티어</span>
          </p>
          <textarea
            value={csvInput}
            onChange={(e) => setCsvInput(e.target.value)}
            placeholder={"혜린, 왕감자#0909, 골드3, 골드3, 페이드/소바, 2\n닉네임, discordname, 플래티넘1, 골드2, 소바/바이퍼, 3"}
            className="w-full h-36 px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 font-mono text-sm"
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
            placeholder="인게임 이름"
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500"
          />
          <input
            type="text"
            value={riotId}
            onChange={(e) => setRiotId(e.target.value)}
            placeholder="디코 이름 (e.g. bo_b) — used for profile picture"
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={peakTier}
              onChange={(e) => setPeakTier(e.target.value)}
              placeholder="최고 티어 (e.g. 골드3)"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500"
            />
            <input
              type="text"
              value={currentTier}
              onChange={(e) => setCurrentTier(e.target.value)}
              placeholder="현 티어 (e.g. 골드3)"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500"
            />
          </div>
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="요원풀 (e.g. 페이드, 소바)"
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500"
          />
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white"
          >
            {TIERS.map((t) => (
              <option key={t} value={t}>
                경매 티어 {t}
              </option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            disabled={!name || !riotId || isAdding}
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
            className="flex items-center gap-3 p-3 bg-gray-700 rounded"
          >
            <span className="px-2 py-1 rounded text-white text-sm font-bold shrink-0" style={getTierStyle(player.tier)}>
              {player.tier}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold truncate">{player.name}</p>
              <p className="text-gray-400 text-xs truncate">{player.riotId}</p>
            </div>
            <div className="text-right shrink-0 text-xs text-gray-400">
              {player.currentTier && <p>{player.currentTier}</p>}
              {player.role && <p className="truncate max-w-24">{player.role}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
