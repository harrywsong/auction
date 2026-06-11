import type { CSSProperties } from 'react';

export function formatCurrency(amount: number): string {
  return `${amount.toLocaleString()}`;
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Distinct, readable colors for tiers A–J
const TIER_COLORS: Record<string, string> = {
  A: '#ef4444', // red
  B: '#3b82f6', // blue
  C: '#eab308', // yellow
  D: '#16a34a', // green
  E: '#8b5cf6', // purple
  F: '#f97316', // orange
  G: '#06b6d4', // cyan
  H: '#ec4899', // pink
  I: '#84cc16', // lime
  J: '#6b7280', // gray
};

export function getTierColor(tier: string): string {
  const tailwind: Record<string, string> = {
    A: 'bg-red-500',
    B: 'bg-blue-500',
    C: 'bg-yellow-500',
    D: 'bg-green-600',
    E: 'bg-purple-500',
    F: 'bg-orange-500',
    G: 'bg-cyan-500',
    H: 'bg-pink-500',
    I: 'bg-lime-500',
    J: 'bg-gray-500',
  };
  return tailwind[tier] || 'bg-gray-400';
}

export function getTierStyle(tier: string): CSSProperties {
  return { backgroundColor: TIER_COLORS[tier] || '#9ca3af' };
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
