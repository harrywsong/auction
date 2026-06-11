import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuctionContext, useAuthContext } from '../context/AuctionContext';
import { useSocket, useSocketEvent, useSocketEmit, useHeartbeat } from '../hooks/useSocket';
import { useSounds } from '../hooks/useSounds';
import { Timer } from '../components/Timer';
import { BiddingPanel } from '../components/BiddingPanel';
import { PlayerCard } from '../components/PlayerCard';
import { CurrentBid } from '../components/CurrentBid';
import { ChatHistory } from '../components/ChatHistory';
import { TeamCompositions } from '../components/TeamCompositions';
import { AuctionQueue } from '../components/AuctionQueue';
import axios from 'axios';
import { config } from '../config';
import { Captain, Player } from '../types';

export function LiveAuctionPage() {
  const navigate = useNavigate();
  const {
    auctionId, auction,
    currentPlayer, setCurrentPlayer,
    captains, setCaptains,
    soldPlayers, setSoldPlayers,
    upNext, setUpNext,
    reserve, setReserve,
    currentBid, setCurrentBid,
    currentLeaderId, setCurrentLeaderId,
    addBidToHistory, bidHistory,
  } = useAuctionContext();
  const { captain, role, session } = useAuthContext();

  const [timerState, setTimerState] = useState({ remainingSeconds: 20, timerLength: 20, isRunning: false });
  const [currentLeaderCaptain, setCurrentLeaderCaptain] = useState<any>(null);
  const [isAdminActing, setIsAdminActing] = useState(false);
  const [queueExhausted, setQueueExhausted] = useState(false);
  const [auctionStatus, setAuctionStatus] = useState<string>('setup');
  const [liveCaptains, setLiveCaptains] = useState<Captain[]>([]);

  const socket = useSocket(auctionId || '', session?.sessionToken ?? '');
  const { play, stop } = useSounds();
  useHeartbeat(socket, 10000);

  // ── Load state on mount ──────────────────────────────────────────────────
  useEffect(() => {
    if (!auctionId) return;
    axios.get(`${config.apiUrl}/api/auction/${auctionId}/state`)
      .then((res) => {
        const d = res.data;
        if (d.currentPlayer) setCurrentPlayer(d.currentPlayer);
        if (d.captains) { setCaptains(d.captains); setLiveCaptains(d.captains); }
        if (d.soldPlayers) setSoldPlayers(d.soldPlayers);
        if (d.upNext) setUpNext(d.upNext);
        if (d.reserve) setReserve(d.reserve);
        if (d.currentBid !== undefined) setCurrentBid(d.currentBid);
        if (d.currentLeaderId !== undefined) setCurrentLeaderId(d.currentLeaderId);
        if (d.auction?.timer_length) {
          setTimerState({ remainingSeconds: d.auction.timer_length, timerLength: d.auction.timer_length, isRunning: false });
        }
        if (d.auction?.status) setAuctionStatus(d.auction.status);
      })
      .catch(() => {});
  }, [auctionId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (captains.length > 0) setLiveCaptains(captains);
  }, [captains]);

  // ── Helper: apply full state payload ─────────────────────────────────────
  const applyState = (data: any) => {
    if (data.currentPlayer) setCurrentPlayer(data.currentPlayer);
    if (data.captains) setLiveCaptains(data.captains);
    if (data.soldPlayers) setSoldPlayers(data.soldPlayers);
    if (data.upNext !== undefined) setUpNext(data.upNext);
    if (data.reserve !== undefined) setReserve(data.reserve);
    if (data.timerState) {
      setTimerState({
        remainingSeconds: data.timerState.remainingSeconds ?? data.timerState.timerLength,
        timerLength: data.timerState.timerLength,
        isRunning: data.timerState.isRunning ?? false,
      });
    }
  };

  // ── Socket events ─────────────────────────────────────────────────────────
  useSocketEvent(socket, 'auction:started', (data) => {
    play('auctionStart');
    setCurrentBid(0); setCurrentLeaderId(null); setCurrentLeaderCaptain(null);
    setQueueExhausted(false);
    applyState(data);
  });

  useSocketEvent(socket, 'player:updated', (data) => {
    stop('timerLow');
    setCurrentBid(0); setCurrentLeaderId(null); setCurrentLeaderCaptain(null);
    setQueueExhausted(false);
    applyState(data);
  });

  useSocketEvent(socket, 'player:sold', (data) => {
    play('sold');
    stop('timerLow');
    if (data.captains) setLiveCaptains(data.captains);
    if (data.soldPlayers) setSoldPlayers(data.soldPlayers);
    if (data.upNext !== undefined) setUpNext(data.upNext);
    if (data.reserve !== undefined) setReserve(data.reserve);
  });

  useSocketEvent(socket, 'player:noSale', () => {
    play('noSale');
    stop('timerLow');
  });

  useSocketEvent(socket, 'player:autoAssigned', (data) => {
    play('autoAssign');
    if (data.captains) setLiveCaptains(data.captains);
    if (data.soldPlayers) setSoldPlayers(data.soldPlayers);
    if (data.upNext !== undefined) setUpNext(data.upNext);
    if (data.reserve !== undefined) setReserve(data.reserve);
  });

  useSocketEvent(socket, 'queue:exhausted', (data) => {
    setQueueExhausted(true);
    if (data.captains) setLiveCaptains(data.captains);
    if (data.soldPlayers) setSoldPlayers(data.soldPlayers);
    if (data.upNext !== undefined) setUpNext(data.upNext);
    if (data.reserve !== undefined) setReserve(data.reserve);
    setCurrentPlayer(null);
    setCurrentBid(0); setCurrentLeaderId(null); setCurrentLeaderCaptain(null);
  });

  useSocketEvent(socket, 'timer:tick', (data) => {
    if (data.remainingSeconds <= 5 && data.remainingSeconds > 0) {
      play('timerLow');
    } else {
      stop('timerLow');
    }
    setTimerState({ remainingSeconds: data.remainingSeconds, timerLength: data.timerLength, isRunning: true });
  });

  useSocketEvent(socket, 'timer:started', (data) => {
    play('timerStart');
    if (data.timerState) {
      setTimerState({
        remainingSeconds: data.timerState.remainingSeconds,
        timerLength: data.timerState.timerLength,
        isRunning: true,
      });
    }
  });

  useSocketEvent(socket, 'bid:placed', (data) => {
    play('bid');
    stop('timerLow');
    setCurrentBid(data.bidAmount);
    setCurrentLeaderId(data.captain.id);
    setCurrentLeaderCaptain(data.captain);
    addBidToHistory({
      id: data.bid.id,
      auctionId: auctionId || '',
      playerId: data.bid.player_id,
      captainId: data.bid.captain_id,
      amount: data.bidAmount,
      createdAt: new Date(),
      captainName: data.captain.name,
    });
    setTimerState((prev) => ({ ...prev, remainingSeconds: data.remainingTime }));
  });

  useSocketEvent(socket, 'auction:finished', () => { stop('timerLow'); play('auctionEnd'); navigate('/results'); });
  useSocketEvent(socket, 'auction:ended', () => navigate('/results'));

  // ── Actions ───────────────────────────────────────────────────────────────
  const emitSocket = useSocketEmit(socket);

  const handleAdminAction = (event: string) => {
    if (!auctionId || isAdminActing) return;
    setIsAdminActing(true);
    emitSocket(event, { auctionId });
    setTimeout(() => setIsAdminActing(false), 1200);
  };

  const onBid = (amount: number) => {
    if (currentPlayer && captain) {
      emitSocket('bid:submit', {
        auctionId,
        playerId: currentPlayer.id,
        captainId: captain.id,
        bidAmount: amount,
      });
    }
  };

  const isAdmin = role === 'admin';
  const liveCaptain = captain
    ? (liveCaptains.find((c) => c.id === captain.id) ?? captain)
    : null;
  const chatSenderName = role === 'admin' ? 'Admin' : (captain?.name ?? 'Spectator');
  const chatRole = (role ?? 'spectator') as 'admin' | 'captain' | 'spectator';

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-b from-gray-900 to-gray-800 flex flex-col px-3 py-3">
      <div className="w-full flex flex-col flex-1 min-h-0 px-2">

        {/* Header */}
        <div className="flex justify-between items-center mb-3 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="뽀낳대" className="h-8 w-auto" />
              <h1 className="text-2xl font-bold text-white">Auction</h1>
            </div>
            {auctionId && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-400">Room Code:</span>
                <span className="text-xs font-mono text-blue-300 bg-gray-800 px-2 py-0.5 rounded select-all">{auctionId}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(auctionId)}
                  className="text-xs text-gray-400 hover:text-white transition-colors"
                  title="Copy to clipboard"
                >
                  📋
                </button>
              </div>
            )}
          </div>

          {isAdmin && (
            <div className="flex gap-2">
              {currentPlayer && !timerState.isRunning && (
                <button
                  onClick={() => handleAdminAction('admin:startTimer')}
                  disabled={isAdminActing}
                  className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-600 text-white rounded font-semibold text-sm transition-colors"
                >
                  ⏱ Start Timer
                </button>
              )}
              {!currentPlayer && !queueExhausted && upNext.length > 0 && (
                <button
                  onClick={() => handleAdminAction('admin:startRegular')}
                  disabled={isAdminActing}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded font-semibold text-sm transition-colors"
                >
                  ▶ Start Auction
                </button>
              )}
              {(queueExhausted || (!currentPlayer && upNext.length === 0)) && reserve.length > 0 && (
                <button
                  onClick={() => handleAdminAction('admin:startReserve')}
                  disabled={isAdminActing}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded font-semibold text-sm transition-colors"
                >
                  ▶ Start Reserve
                </button>
              )}
              {(queueExhausted || (!currentPlayer && upNext.length === 0)) && reserve.length === 0 && !currentPlayer && (
                <span className="px-4 py-2 bg-gray-700 text-gray-400 rounded text-sm">
                  Auction Complete
                </span>
              )}
            </div>
          )}
        </div>

        {/* Custom grid: Teams(wider) | Player+Timer+Bidding(narrower) | CurrentBid+Chat | Queues(narrow) */}
        <div className="grid grid-cols-1 gap-4 flex-1 min-h-0"
          style={{ gridTemplateColumns: '0.8fr 1.4fr 1fr 0.7fr' }}>

          {/* Col 1: Teams — scrollable */}
          <div className="h-full overflow-y-auto min-h-0">
            <TeamCompositions captains={liveCaptains} soldPlayers={soldPlayers} />
          </div>

          {/* Col 2: Player card + Timer + Bidding panel */}
          <div className="h-full flex flex-col gap-3 min-h-0">
            {queueExhausted && !currentPlayer ? (
              <div className="flex-1 p-8 bg-gray-800 rounded-lg flex items-center justify-center text-gray-300">
                <div className="text-center">
                  <p className="text-xl font-semibold">Main queue exhausted</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {reserve.length > 0
                      ? 'Admin can start the reserve round.'
                      : 'All players have been auctioned.'}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="shrink-0">
                  <PlayerCard player={currentPlayer} />
                </div>
                <div className="shrink-0">
                  <Timer
                    remainingSeconds={timerState.remainingSeconds}
                    timerLength={timerState.timerLength}
                    isRunning={timerState.isRunning}
                  />
                </div>
                <div className="flex-1 min-h-0">
                  {liveCaptain ? (
                    <BiddingPanel
                      captain={liveCaptain}
                      currentBid={currentBid}
                      onBidSubmit={onBid}
                      isDisabled={!timerState.isRunning || !currentPlayer}
                      bidIncrement={auction?.bidIncrement || 5}
                      captainTiers={soldPlayers
                        .filter((p) => p.assignedCaptainId === liveCaptain.id)
                        .map((p) => p.tier)}
                      currentPlayerTier={currentPlayer?.tier}
                    />
                  ) : (
                    <div className="h-full p-4 bg-gray-800 rounded text-center text-gray-300 text-sm flex items-center justify-center">
                      {isAdmin ? 'Admin View' : 'Spectator Mode'}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Col 4: CurrentBid (fixed) + Chat (fills rest) */}
          <div className="h-full flex flex-col gap-3 min-h-0">
            <div className="shrink-0">
              <CurrentBid currentBid={currentBid} currentLeader={currentLeaderCaptain} />
            </div>
            <div className="flex-1 min-h-0">
              <ChatHistory
                socket={socket}
                auctionId={auctionId}
                bids={bidHistory}
                senderName={chatSenderName}
                role={chatRole}
              />
            </div>
          </div>

          {/* Col 5: Up Next + Reserve */}
          <div className="h-full min-h-0">
            <AuctionQueue upNext={upNext} reserve={reserve} />
          </div>
        </div>
      </div>
    </div>
  );
}
