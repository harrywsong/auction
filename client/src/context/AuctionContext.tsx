import React, { createContext, useContext, useState, useCallback } from 'react';
import { Auction, Captain, Player, Session, Bid } from '../types';

interface AuctionContextType {
  auctionId: string | null;
  setAuctionId: (id: string) => void;
  auction: Auction | null;
  setAuction: (auction: Auction | null) => void;
  captain: Captain | null;
  setCaptain: (captain: Captain | null) => void;
  currentPlayer: Player | null;
  setCurrentPlayer: (player: Player | null) => void;
  players: Player[];
  setPlayers: (players: Player[]) => void;
  captains: Captain[];
  setCaptains: (captains: Captain[]) => void;
  soldPlayers: Player[];
  setSoldPlayers: (players: Player[]) => void;
  upNext: Player[];
  setUpNext: (players: Player[]) => void;
  reserve: Player[];
  setReserve: (players: Player[]) => void;
  currentBid: number;
  setCurrentBid: (bid: number) => void;
  currentLeaderId: string | null;
  setCurrentLeaderId: (id: string | null) => void;
  bidHistory: Bid[];
  addBidToHistory: (bid: Bid) => void;
  clearBidHistory: () => void;
}

interface AuthContextType {
  role: 'admin' | 'captain' | 'spectator' | null;
  setRole: (role: 'admin' | 'captain' | 'spectator') => void;
  session: Session | null;
  setSession: (session: Session | null) => void;
  captainId?: string;
  setCaptainId?: (id: string | undefined) => void;
  captain?: Captain | null;
  setCaptain?: (captain: Captain | null | undefined) => void;
}

export const AuctionContext = createContext<AuctionContextType | null>(null);
export const AuthContext = createContext<AuthContextType | null>(null);

export function AuctionProvider({ children }: { children: React.ReactNode }) {
  const [auctionId, setAuctionIdState] = useState<string | null>(
    () => localStorage.getItem('auctionId')
  );
  const [auction, setAuction] = useState<Auction | null>(null);
  const [captain, setCaptain] = useState<Captain | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [captains, setCaptains] = useState<Captain[]>([]);
  const [soldPlayers, setSoldPlayers] = useState<Player[]>([]);
  const [upNext, setUpNext] = useState<Player[]>([]);
  const [reserve, setReserve] = useState<Player[]>([]);
  const [currentBid, setCurrentBid] = useState(0);
  const [currentLeaderId, setCurrentLeaderId] = useState<string | null>(null);
  const [bidHistory, setBidHistory] = useState<Bid[]>([]);

  const setAuctionId = useCallback((id: string) => {
    localStorage.setItem('auctionId', id);
    setAuctionIdState(id);
  }, []);

  const addBidToHistory = useCallback((bid: Bid) => {
    setBidHistory((prev) => [bid, ...prev].slice(0, 20)); // Keep last 20 bids
  }, []);

  const clearBidHistory = useCallback(() => {
    setBidHistory([]);
  }, []);

  const value: AuctionContextType = {
    auctionId,
    setAuctionId,
    auction,
    setAuction,
    captain,
    setCaptain,
    currentPlayer,
    setCurrentPlayer,
    players,
    setPlayers,
    captains,
    setCaptains,
    soldPlayers,
    setSoldPlayers,
    upNext,
    setUpNext,
    reserve,
    setReserve,
    currentBid,
    setCurrentBid,
    currentLeaderId,
    setCurrentLeaderId,
    bidHistory,
    addBidToHistory,
    clearBidHistory,
  };

  return (
    <AuctionContext.Provider value={value}>
      {children}
    </AuctionContext.Provider>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<'admin' | 'captain' | 'spectator' | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [captainId, setCaptainId] = useState<string | undefined>();
  const [captain, setCaptain] = useState<Captain | null | undefined>();

  const value: AuthContextType = {
    role,
    setRole,
    session,
    setSession,
    captainId,
    setCaptainId,
    captain,
    setCaptain,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuctionContext() {
  const context = useContext(AuctionContext);
  if (!context) {
    throw new Error('useAuctionContext must be used within AuctionProvider');
  }
  return context;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
}
