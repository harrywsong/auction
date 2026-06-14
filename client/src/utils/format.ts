import type { CSSProperties } from 'react';

export function formatCurrency(amount: number): string {
  return `${amount.toLocaleString()}`;
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Distinct, readable colors for tiers 1, 3–10
const TIER_COLORS: Record<string, string> = {
  '1':  '#ef4444', // red
  '3':  '#eab308', // yellow
  '4':  '#16a34a', // green
  '5':  '#8b5cf6', // purple
  '6':  '#f97316', // orange
  '7':  '#06b6d4', // cyan
  '8':  '#ec4899', // pink
  '9':  '#84cc16', // lime
  '10': '#3b82f6', // blue (formerly tier 2)
};

export function getTierColor(tier: string): string {
  const tailwind: Record<string, string> = {
    '1':  'bg-red-500',
    '3':  'bg-yellow-500',
    '4':  'bg-green-600',
    '5':  'bg-purple-500',
    '6':  'bg-orange-500',
    '7':  'bg-cyan-500',
    '8':  'bg-pink-500',
    '9':  'bg-lime-500',
    '10': 'bg-blue-500',
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
