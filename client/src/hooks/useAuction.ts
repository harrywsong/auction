import { useState, useEffect, useCallback } from 'react';
import { Auction, Captain, Player } from '../types';
import { config } from '../config';
import axios from 'axios';

export function useAuction(auctionId: string, token?: string) {
  const [auction, setAuction] = useState<Auction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAuction = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `${config.apiUrl}/api/auction/${auctionId}`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }
        );
        setAuction(response.data);
        setError(null);
      } catch (err) {
        setError((err as any).message || 'Failed to fetch auction');
      } finally {
        setLoading(false);
      }
    };

    if (auctionId) {
      fetchAuction();
    }
  }, [auctionId, token]);

  return { auction, loading, error, setAuction };
}

export function useCaptain(captainId: string, token?: string) {
  const [captain, setCaptain] = useState<Captain | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCaptain = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `${config.apiUrl}/api/captain/${captainId}`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }
        );
        setCaptain(response.data);
        setError(null);
      } catch (err) {
        setError((err as any).message || 'Failed to fetch captain');
      } finally {
        setLoading(false);
      }
    };

    if (captainId) {
      fetchCaptain();
    }
  }, [captainId, token]);

  return { captain, loading, error };
}
