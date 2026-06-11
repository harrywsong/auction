export function formatCurrency(amount: number): string {
  return `${amount.toLocaleString()}`;
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

import type { CSSProperties } from 'react';

export function getTierColor(tier: string): string {
  const colors: Record<string, string> = {
    A: 'bg-red-500',
    B: 'bg-blue-500',
    C: 'bg-yellow-500',
    D: 'bg-green-600',
    E: 'bg-gray-500',
  };
  return colors[tier] || 'bg-gray-400';
}

export function getTierStyle(tier: string): CSSProperties {
  const colors: Record<string, string> = {
    A: '#ef4444',
    B: '#3b82f6',
    C: '#eab308',
    D: '#16a34a',
    E: '#6b7280',
  };
  return { backgroundColor: colors[tier] || '#9ca3af' };
}

export function formatDiscordResults(teams: any[]): string {
  let result = '뽀낳대 Auction Results\n====================\n\n';

  teams.forEach((team) => {
    result += `${team.captain.name} — ${team.captain.currentPoints ?? team.captain.current_points} pts remaining\n`;
    team.players.forEach((player: any) => {
      const roles = player.role || player.riotId || '';
      result += `  [${player.tier}] ${player.name}${roles ? ` (${roles})` : ''}\n`;
    });
    result += '\n';
  });

  return result;
}
