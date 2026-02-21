'use client';

import React from 'react';
import { useSlipStore } from '@/stores/slipStore';
import { useProfile } from '@/hooks/useProfile';
import { useUser, SignInButton } from '@clerk/nextjs';
import { placeEntry } from '@/actions/placeEntry';
import { useToastStore } from '@/components/KimiToast';
import { X, ArrowUp, ArrowDown } from 'lucide-react';
import { CoinIcon } from '@/components/Nav';

interface BetSlipV2Props {
  onToast?: (msg: string) => void;
  onClose?: () => void;
}

export default function BetSlipV2({ onToast, onClose }: BetSlipV2Props = {}) {
  const { picks, wager, setWager, clearSlip, removePick, getMultiplier, getPotentialPayout } = useSlipStore();
  const { user, refreshBalance } = useProfile();
  const { isSignedIn } = useUser();
  const toast = useToastStore((s) => s.show);
  const [submitting, setSubmitting] = React.useState(false);

  const legCount = picks.length;
  const multiplier = getMultiplier();
  const payout = getPotentialPayout();
  const balance = user?.balance ?? 0;

  const showToast = (msg: string) => {
    onToast?.(msg);
    toast(msg);
  };

  const handleSubmit = async () => {
    if (!isSignedIn || !user) return;
    if (legCount < 2 || wager < 50 || wager > 2000 || wager > balance) return;
    setSubmitting(true);
    try {
      await placeEntry(user.id, refreshBalance);
      showToast(`Entry placed! ${legCount} legs @ ${wager.toLocaleString()} K — ${multiplier}x payout`);
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="slip-container">
      <div className="slip-header">
        <div className="slip-title">Entry Slip</div>
        {legCount > 0 && <div className="slip-count">{legCount}</div>}
      </div>

      {legCount === 0 ? (
        <div className="slip-empty">
          <div className="slip-empty-icon"><CoinIcon size={28} /></div>
          <div className="slip-empty-text">
            Select Over or Under on player props to build your entry
          </div>
        </div>
      ) : (
        <>
          <div className="slip-legs">
            {picks.map((pick, i) => {
              const pl = pick.propLine;
              const playerName =
                pl.player?.ign || pl.player?.name || 'Player';
              const propTypeName = pl.prop_type?.name || 'Total Kills';
              const teamAbbrev =
                pl.player?.team?.abbrev ||
                pl.player?.team?.name?.substring(0, 3).toUpperCase() ||
                '';
              const teamColor = pl.player?.team?.color || '#00e5a0';
              return (
                <div
                  className="slip-leg"
                  key={pl.id}
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="slip-leg-bar" style={{ background: teamColor }} />
                  <div className="slip-leg-info">
                    <div className="slip-leg-player">{playerName}</div>
                    <div className="slip-leg-detail">
                      {propTypeName} — {pl.line_value} • {teamAbbrev}
                    </div>
                  </div>
                  <div className={`slip-leg-pick ${pick.direction}`}>
                    {pick.direction === 'over' ? 'OVR' : 'UND'}
                  </div>
                  <button
                    className="slip-remove"
                    onClick={() => removePick(pl.id)}
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="slip-footer">
            <div className="slip-multiplier">
              <span>{legCount}-leg multiplier</span>
              <span className="slip-multiplier-value">{multiplier}x</span>
            </div>

            <div className="slip-quick-amounts">
              {[50, 100, 250, 500].map((amt) => (
                <button
                  key={amt}
                  className={`quick-amt ${wager === amt ? 'active' : ''}`}
                  onClick={() => setWager(amt)}
                >
                  {amt.toLocaleString()}
                </button>
              ))}
            </div>

            <div className="slip-wager">
              <span className="slip-wager-label">K-Coins</span>
              <input
                className="slip-wager-input"
                type="number"
                placeholder="0"
                value={wager || ''}
                onChange={(e) =>
                  setWager(Math.max(0, Number(e.target.value)))
                }
              />
            </div>

            <div className="slip-payout">
              <span className="slip-payout-label">Potential Payout</span>
              <span className="slip-payout-value">
                {payout > 0 && <CoinIcon size={16} />}
                {payout > 0 ? payout.toLocaleString() : '—'}
              </span>
            </div>

            {!isSignedIn ? (
              <SignInButton mode="modal">
                <button className="slip-submit">
                  Sign In to Place Entry
                </button>
              </SignInButton>
            ) : (
              <button
                className="slip-submit"
                disabled={submitting || legCount < 2 || legCount > 6 || wager < 50 || wager > 2000 || wager > balance}
                onClick={handleSubmit}
              >
                {submitting
                  ? 'Placing...'
                  : legCount < 2
                  ? `Pick at least 2 (${legCount}/2)`
                  : legCount > 6
                  ? 'Max 6 picks'
                  : wager < 50
                  ? 'Min 50 K-Coins'
                  : wager > 2000
                  ? 'Max 2,000 K-Coins'
                  : wager > balance
                  ? 'Insufficient balance'
                  : `Place Entry — ${wager.toLocaleString()} K`}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
