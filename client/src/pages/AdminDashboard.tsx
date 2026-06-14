import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuctionContext } from '../context/AuctionContext';
import { PlayerStatus } from '../types';
import { CaptainList } from '../components/CaptainList';
import { PlayerList } from '../components/PlayerList';
import axios from 'axios';
import { config } from '../config';
import { initializeSocket, disconnectSocket } from '../utils/socket';

export function AdminDashboard() {
  const navigate = useNavigate();
  const { auctionId, setAuctionId, captains, setCaptains, players, setPlayers } = useAuctionContext();
  const [auctionName, setAuctionName] = useState('Temp Auction Name');
  const [bidIncrement, setBidIncrement] = useState(5);
  const [timerLength, setTimerLength] = useState(20);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState('');

  // Clear any previous auction state when admin opens a fresh dashboard
  useEffect(() => {
    localStorage.removeItem('auctionId');
    disconnectSocket();
    setCaptains([]);
    setPlayers([]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddCaptain = async (name: string, points: number) => {
    const newCaptain = {
      id: `local-${Date.now()}`,
      auctionId: auctionId || '',
      name,
      startingPoints: points,
      currentPoints: points,
      createdAt: new Date(),
    };
    setCaptains([...captains, newCaptain]);
  };

  const handleAddPlayer = async (name: string, riotId: string, tier: string, peakTier: string, currentTier: string, role: string) => {
    const newPlayer = {
      id: `local-${Date.now()}`,
      auctionId: auctionId || '',
      name,
      riotId,        // Discord name
      tier: tier as '1' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10',
      role,          // 요원풀
      peakTier,      // 최고 티어
      currentTier,   // 현 티어
      status: PlayerStatus.PENDING,
      assignedCaptainId: null,
      pointsSpent: 0,
      createdAt: new Date(),
    };
    setPlayers([...players, newPlayer]);
  };

  const handleBulkImport = async (csv: string) => {
    const lines = csv.trim().split('\n');
    const newPlayers = lines
      .map((line) => line.trim().replace(/\r/g, ''))
      .filter((line) => line.length > 0)
      .map((line, i) => {
        const parts = line.split(',').map((p) => p.trim().replace(/\r/g, ''));
        // Format: 이름, 디코명, 최고티어, 현티어, 요원풀, 경매티어
        const [name, riotId, peakTier, currentTier, role, tier] = parts;
        if (!name || !tier) return null;
        const cleanTier = tier.replace(/\r/g, '').trim();
        if (!['1','3','4','5','6','7','8','9','10'].includes(cleanTier)) {
          console.warn(`Skipping player "${name}": invalid tier value "${cleanTier}"`);
          return null;
        }
        return {
          id: `local-${Date.now()}-${i}`,
          auctionId: auctionId || '',
          name,
          riotId: riotId || '',
          tier: cleanTier as '1' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10',
          role: role || '',
          peakTier: peakTier || '',
          currentTier: currentTier || '',
          status: PlayerStatus.PENDING,
          assignedCaptainId: null,
          pointsSpent: 0,
          createdAt: new Date(),
        };
      })
      .filter(Boolean) as typeof players;
    setPlayers([...players, ...newPlayers]);
  };

  const handleStartAuction = async () => {
    if (captains.length === 0 || players.length === 0) return;

    setIsStarting(true);
    setError('');

    try {
      const adminKey = import.meta.env.VITE_ADMIN_KEY || 'admin';
      const headers = { 'X-Admin-Key': adminKey };

      // Step 1: Always create a fresh auction
      const createRes = await axios.post(
        `${config.apiUrl}/api/auction/create`,
        { name: auctionName },
        { headers }
      );
      const activeAuctionId = createRes.data.id;
      setAuctionId(activeAuctionId);

      // Step 2: Push captains & players to the server
      await axios.post(
        `${config.apiUrl}/api/auction/${activeAuctionId}/setup`,
        { captains, players, bidIncrement, timerLength },
        { headers }
      );

      // Step 3: Connect socket and emit start
      const socket = initializeSocket(activeAuctionId!, '');
      socket.emit('join:auction', { auctionId: activeAuctionId });

      socket.emit('admin:startRegular', { auctionId: activeAuctionId }, (response: any) => {
        if (response?.error) {
          setError(`Failed to start: ${response.error}`);
          setIsStarting(false);
        } else {
          navigate('/auction');
        }
      });
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to start auction');
      setIsStarting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-4xl font-bold text-white">Admin Dashboard</h1>

        {error && (
          <div className="p-4 bg-red-900 text-red-200 rounded">{error}</div>
        )}

        {/* Shareable auction info — shown once an auction exists */}
        {auctionId && (
          <div className="p-4 bg-gray-700 border border-blue-500 rounded-lg flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">Clean Up Old Auctions</p>
              {/* <p className="text-white font-mono text-sm break-all">{auctionId}</p> */}
            </div>
            <div className="flex gap-2 shrink-0">
              {/* <button
                onClick={() => { navigator.clipboard.writeText(auctionId); }}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold"
              >
                Copy
              </button> */}
              <button
                onClick={async () => {
                  if (!confirm('Delete all other auctions from the database? This cannot be undone.')) return;
                  try {
                    const res = await axios.delete(`${config.apiUrl}/api/auction/cleanup`, {
                      headers: { 'X-Admin-Key': import.meta.env.VITE_ADMIN_KEY || 'admin123' },
                      data: { keepId: auctionId },
                    });
                    alert(`Cleaned up ${res.data.deleted} old auction(s).`);
                  } catch (e: any) {
                    alert('Cleanup failed: ' + (e.response?.data?.error || e.message));
                  }
                }}
                className="px-3 py-2 bg-red-700 hover:bg-red-800 text-white rounded text-sm font-semibold"
              >
                Clean Up Old Auctions
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CaptainList captains={captains} onAddCaptain={handleAddCaptain} />
          <PlayerList
            players={players}
            onAddPlayer={handleAddPlayer}
            onBulkImport={handleBulkImport}
          />
        </div>

        <div className="p-6 bg-gray-800 rounded-lg space-y-4">
          <h3 className="text-xl font-semibold text-white">Settings</h3>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Auction Name</label>
              <input
                type="text"
                value={auctionName}
                onChange={(e) => setAuctionName(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Bid Increment</label>
                <input
                  type="number"
                  value={bidIncrement}
                  onChange={(e) => setBidIncrement(parseInt(e.target.value))}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Timer Length (seconds)</label>
                <input
                  type="number"
                  value={timerLength}
                  onChange={(e) => setTimerLength(parseInt(e.target.value))}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setPlayers([...players].sort(() => Math.random() - 0.5))}
              disabled={players.length === 0}
              className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded font-semibold text-lg transition-colors"
            >
              🔀 Randomize Order
            </button>
            <button
              onClick={handleStartAuction}
              disabled={captains.length === 0 || players.length === 0 || isStarting}
              className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded font-semibold text-lg transition-colors"
            >
              {isStarting ? '🔄 Starting...' : '🚀 Start Auction'}
            </button>
          </div>

          <div className="text-sm text-gray-400 text-center">
            {captains.length} captain{captains.length !== 1 ? 's' : ''} · {players.length} player{players.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </div>
  );
}
