import React, { useState } from 'react';
import { Captain } from '../types';
import { formatCurrency } from '../utils/format';

interface CaptainListProps {
  captains: Captain[];
  onAddCaptain: (name: string, points: number) => Promise<void>;
}

export function CaptainList({ captains, onAddCaptain }: CaptainListProps) {
  const [name, setName] = useState('');
  const [points, setPoints] = useState('1000');
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    if (name && points) {
      setIsAdding(true);
      try {
        await onAddCaptain(name, parseInt(points));
        setName('');
        setPoints('1000');
      } finally {
        setIsAdding(false);
      }
    }
  };

  return (
    <div className="p-6 bg-gray-800 rounded-lg space-y-4">
      <h3 className="text-xl font-semibold text-white">Captains</h3>

      <div className="space-y-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Captain name"
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500"
        />
        <input
          type="number"
          value={points}
          onChange={(e) => setPoints(e.target.value)}
          placeholder="Starting points"
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500"
        />
        <button
          onClick={handleAdd}
          disabled={!name || !points || isAdding}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded font-semibold"
        >
          {isAdding ? 'Adding...' : 'Add Captain'}
        </button>
      </div>

      <div className="space-y-2">
        {captains.map((captain) => (
          <div
            key={captain.id}
            className="flex justify-between items-center p-3 bg-gray-700 rounded"
          >
            <span className="text-white font-semibold">{captain.name}</span>
            <span className="text-blue-400">{formatCurrency(captain.startingPoints)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
