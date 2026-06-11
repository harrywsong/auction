import React, { useEffect, useState } from 'react';
import { useAuctionContext } from '../context/AuctionContext';
import { DiscordExport } from '../components/DiscordExport';
import { formatCurrency, getTierColor } from '../utils/format';
import axios from 'axios';
import { config } from '../config';

export function ResultsPage() {
  const { auctionId } = useAuctionContext();
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const response = await axios.get(
          `${config.apiUrl}/api/auction/${auctionId}/results`
        );
        setTeams(response.data.teams);
      } catch (error) {
        console.error('Failed to load results:', error);
      } finally {
        setLoading(false);
      }
    };

    if (auctionId) {
      fetchResults();
    }
  }, [auctionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center">
        <p className="text-white text-xl">Loading results...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold text-white">Auction Results</h1>
          <DiscordExport teams={teams} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {teams.map((team) => (
            <div key={team.captain.id} className="p-6 bg-gray-800 rounded-lg">
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-white mb-1">
                  {team.captain.name}
                </h2>
                <p className="text-gray-400">
                  Remaining Points:{' '}
                  {formatCurrency(team.captain.current_points)}
                </p>
              </div>

              <div className="space-y-2">
                {team.players.map((player: any) => (
                  <div
                    key={player.id}
                    className="flex items-center gap-3 p-3 bg-gray-700 rounded"
                  >
                    <span
                      className={`px-2 py-1 rounded text-white text-sm font-bold ${getTierColor(
                        player.tier
                      )}`}
                    >
                      {player.tier}
                    </span>
                    <div className="flex-1">
                      <p className="text-white font-semibold">{player.name}</p>
                      <p className="text-gray-400 text-sm">
                        {player.role || player.riot_id}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
