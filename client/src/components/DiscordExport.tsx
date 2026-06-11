import React from 'react';
import { formatDiscordResults } from '../utils/format';

interface DiscordExportProps {
  teams: any[];
}

export function DiscordExport({ teams }: DiscordExportProps) {
  const handleCopyToClipboard = () => {
    const text = formatDiscordResults(teams);
    navigator.clipboard.writeText(text);
    alert('Results copied to clipboard!');
  };

  return (
    <button
      onClick={handleCopyToClipboard}
      className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded font-semibold transition-colors"
    >
      📋 Copy
    </button>
  );
}
