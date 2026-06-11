import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext, useAuctionContext } from '../context/AuctionContext';
import axios from 'axios';
import { config } from '../config';

export function LoginPage() {
  const navigate = useNavigate();
  const { setRole, setSession, setCaptain } = useAuthContext();
  const { setAuctionId } = useAuctionContext();

  const [auctionId, setAuctionIdInput] = useState('');
  const [captainName, setCaptainName] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [tab, setTab] = useState<'captain' | 'spectator' | 'admin'>('captain');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCaptainLogin = async () => {
    if (!auctionId.trim()) { setError('Please enter the auction ID'); return; }
    if (!captainName.trim()) { setError('Please enter your captain name'); return; }

    setLoading(true);
    setError('');
    try {
      const response = await axios.post(`${config.apiUrl}/api/captain/join`, {
        auctionId: auctionId.trim(),
        captainName: captainName.trim(),
      });
      setRole('captain');
      setSession(response.data.session);
      setCaptain && setCaptain(response.data.captain);
      setAuctionId(auctionId.trim());
      navigate('/auction');
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Login failed';
      setError(msg === 'Auction has not started yet'
        ? 'The auction has not started yet. Wait for the admin to press Start Auction.'
        : msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSpectatorLogin = () => {
    if (!auctionId.trim()) { setError('Please enter the auction ID'); return; }
    setRole('spectator');
    setAuctionId(auctionId.trim());
    navigate('/auction');
  };

  const handleAdminLogin = () => {
    const expected = import.meta.env.VITE_ADMIN_KEY || 'admin123';
    if (adminPassword !== expected) { setError('Incorrect admin password'); return; }
    setRole('admin');
    navigate('/admin');
  };

  const auctionIdField = (
    <div>
      <label className="block text-sm text-gray-400 mb-1">Auction ID</label>
      <input
        type="text"
        value={auctionId}
        onChange={(e) => { setAuctionIdInput(e.target.value); setError(''); }}
        onKeyDown={(e) => e.key === 'Enter' && (tab === 'captain' ? handleCaptainLogin() : handleSpectatorLogin())}
        placeholder="Paste the auction ID from the admin"
        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono text-sm"
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">

        <div className="text-center">
          <img src="/logo.png" alt="뽀낳대" className="mx-auto mb-2" style={{ maxHeight: '160px' }} />
          <p className="text-gray-400 text-sm">VALORANT 멸망전</p>
        </div>

        {error && (
          <div className="p-3 bg-red-900 text-red-100 rounded text-sm">{error}</div>
        )}

        {/* Tabs */}
        <div className="flex rounded-lg overflow-hidden border border-gray-600">
          {(['captain', 'spectator', 'admin'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(''); }}
              className={`flex-1 py-2 text-sm font-semibold capitalize transition-colors ${
                tab === t ? 'bg-gray-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {t === 'captain' ? '⚔️ Captain' : t === 'spectator' ? '👁️ Spectator' : '🔑 Admin'}
            </button>
          ))}
        </div>

        {/* Captain */}
        {tab === 'captain' && (
          <div className="space-y-4">
            {auctionIdField}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Your Captain Name</label>
              <input
                type="text"
                value={captainName}
                onChange={(e) => { setCaptainName(e.target.value); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleCaptainLogin()}
                placeholder="Enter your name exactly as registered"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Case-insensitive. Must match what the admin entered.</p>
            </div>
            <button
              onClick={handleCaptainLogin}
              disabled={loading}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded font-semibold transition-colors"
            >
              {loading ? 'Joining...' : 'Join as Captain'}
            </button>
          </div>
        )}

        {/* Spectator */}
        {tab === 'spectator' && (
          <div className="space-y-4">
            {auctionIdField}
            <button
              onClick={handleSpectatorLogin}
              className="w-full px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded font-semibold transition-colors"
            >
              Watch as Spectator
            </button>
          </div>
        )}

        {/* Admin */}
        {tab === 'admin' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Admin Password</label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => { setAdminPassword(e.target.value); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                placeholder="Enter admin password"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              onClick={handleAdminLogin}
              className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded font-semibold transition-colors"
            >
              Enter Admin Dashboard
            </button>
          </div>
        )}

        <p className="text-center text-xs text-gray-500">
          Get the Auction ID from the admin
        </p>
      </div>
    </div>
  );
}
