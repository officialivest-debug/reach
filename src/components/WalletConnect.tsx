"use client";

import { useState } from "react";
import { useConnect, useDisconnect, useAccount, useBalance } from "wagmi";
import { Wallet, CheckCircle, X, Loader2, ExternalLink, AlertCircle, Edit3, QrCode } from "lucide-react";

interface Props {
  userId: string;
  initialAddress?: string | null;
  onConnected?: (address: string) => void;
}

export default function WalletConnect({ userId, initialAddress, onConnected }: Props) {
  const [connectError, setConnectError] = useState<string | null>(null);
  const { connect, connectors, isPending } = useConnect({
    mutation: {
      onError: (err) => {
        if (err.message.toLowerCase().includes("connector not found") || err.message.toLowerCase().includes("provider not found")) {
          setConnectError("No browser wallet extension detected (e.g. MetaMask / Phantom). Please use WalletConnect (Scan QR) or enter your address manually below.");
        } else {
          setConnectError(err.message || "Failed to connect wallet.");
        }
      },
      onSuccess: () => {
        setConnectError(null);
      },
    },
  });

  const { disconnect } = useDisconnect();
  const { address, isConnected, chain } = useAccount();
  const { data: balance } = useBalance({ address });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [manualMode, setManualMode] = useState(true);
  const [manualAddr, setManualAddr] = useState(initialAddress || "");
  const [manualError, setManualError] = useState<string | null>(null);

  const activeAddress = address || (initialAddress && !isConnected ? initialAddress : null);

  const saveWallet = async (addr: string) => {
    setSaving(true);
    setConnectError(null);
    try {
      const res = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          updates: {
            wallet_address: addr.trim(),
            wallet_verified: true,
          },
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save wallet address");
      }

      setSaved(true);
      onConnected?.(addr.trim());
    } catch (err: unknown) {
      setConnectError(err instanceof Error ? err.message : "Error saving wallet");
    } finally {
      setSaving(false);
    }
  };

  const handleManualSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualError(null);
    const cleaned = manualAddr.trim();
    if (!cleaned) {
      setManualError("Please enter a valid wallet address.");
      return;
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(cleaned) && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(cleaned)) {
      setManualError("Please enter a valid EVM (0x...) or Solana wallet address.");
      return;
    }

    await saveWallet(cleaned);
    setManualMode(false);
  };

  const handleRemoveWallet = async () => {
    setSaving(true);
    try {
      if (isConnected) {
        disconnect();
      }
      await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          updates: {
            wallet_address: null,
            wallet_verified: false,
          },
        }),
      });
      setSaved(false);
      setManualAddr("");
      onConnected?.("");
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // If a wallet is currently active (via live Web3 or saved DB address)
  if (activeAddress && !manualMode) {
    const explorerUrl = chain?.blockExplorers?.default.url
      ? `${chain.blockExplorers.default.url}/address/${activeAddress}`
      : `https://etherscan.io/address/${activeAddress}`;

    return (
      <div className="bg-[#0F0F1A] border border-[#3A3A52] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CheckCircle size={15} className="text-emerald-400" />
            <span className="text-[#F5F3ED] text-sm font-medium">
              {isConnected ? "Wallet Connected" : "Verified Wallet"}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
              Verified
            </span>
          </div>
          <button
            onClick={handleRemoveWallet}
            title="Disconnect or change wallet"
            className="text-[#5C5A70] hover:text-red-400 transition p-1"
          >
            <X size={15} />
          </button>
        </div>

        <div className="bg-[#1A1A2E] rounded-lg p-3 mb-3 border border-[#3A3A52]/60">
          <div className="text-[#5C5A70] text-xs mb-1">Address</div>
          <div className="text-[#F5F3ED] text-xs font-mono break-all select-all">
            {activeAddress}
          </div>
        </div>

        {isConnected && balance && (
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[#5C5A70] text-xs">Balance</span>
            <span className="text-[#F5F3ED] text-xs font-medium">
              {(Number(balance.value) / 10 ** balance.decimals).toFixed(4)} {balance.symbol}
            </span>
          </div>
        )}

        {isConnected && chain && (
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-[#5C5A70] text-xs">Network</span>
            <span className="text-[#C9A84C] text-xs font-medium">{chain.name}</span>
          </div>
        )}

        <div className="flex items-center gap-2 pt-2 border-t border-[#3A3A52]/40">
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 border border-[#3A3A52] text-[#A8A6B8] hover:text-[#F5F3ED] text-xs py-2 rounded-lg hover:border-[#5C5A70] transition"
          >
            <ExternalLink size={12} />
            Explorer
          </a>

          {isConnected && address && activeAddress !== initialAddress && !saved ? (
            <button
              onClick={() => saveWallet(address)}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-1.5 bg-[#C9A84C] text-[#1A1A2E] text-xs font-bold py-2 rounded-lg hover:opacity-90 transition disabled:opacity-50"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : "Save to profile"}
            </button>
          ) : (
            <button
              onClick={() => setManualMode(true)}
              className="flex items-center justify-center gap-1.5 border border-[#3A3A52] text-[#A8A6B8] hover:text-[#F5F3ED] text-xs py-2 px-3 rounded-lg hover:border-[#C9A84C] transition"
            >
              <Edit3 size={12} /> Edit
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0F0F1A] border border-[#3A3A52] rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Wallet size={16} className="text-[#C9A84C]" />
          <span className="text-[#F5F3ED] text-sm font-semibold">Connect Wallet</span>
        </div>
        <button
          onClick={() => {
            setManualMode(!manualMode);
            setConnectError(null);
          }}
          className="text-xs text-[#C9A84C] hover:underline flex items-center gap-1 font-medium"
        >
          {manualMode ? "Scan QR / Extension" : "Manual entry"}
        </button>
      </div>

      <div className="text-[#8E8CA0] text-xs mb-3.5 leading-relaxed">
        <p>Connect your wallet or provide an address to verify on-chain holding and unlock deal room features.</p>
        <p className="text-[#5C5A70] mt-1 text-[11px]">Read-only: never asks for signing or transfers.</p>
      </div>

      {connectError && (
        <div className="mb-3 p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-start gap-2">
          <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-400" />
          <span className="leading-relaxed">{connectError}</span>
        </div>
      )}

      {manualMode ? (
        <form onSubmit={handleManualSave} className="flex flex-col gap-2.5">
          <div>
            <label className="text-[#A8A6B8] text-[11px] mb-1 block">Public Wallet Address (EVM / Solana)</label>
            <input
              type="text"
              value={manualAddr}
              onChange={(e) => setManualAddr(e.target.value)}
              placeholder="0x... or Solana address"
              className="w-full bg-[#1A1A2E] border border-[#3A3A52] text-[#F5F3ED] text-xs rounded-lg px-3 py-2.5 outline-none focus:border-[#C9A84C] font-mono transition"
            />
          </div>

          {manualError && (
            <p className="text-red-400 text-xs flex items-center gap-1">
              <AlertCircle size={12} /> {manualError}
            </p>
          )}

          <div className="flex items-center gap-2 mt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-lg bg-[#C9A84C] text-[#1A1A2E] font-bold text-xs hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : "Save & Verify Address"}
            </button>
          </div>

          <div className="mt-2 pt-2 border-t border-[#3A3A52]/40 text-center">
            <button
              type="button"
              onClick={() => setManualMode(false)}
              className="text-[11px] text-[#A8A6B8] hover:text-[#C9A84C] transition inline-flex items-center gap-1.5"
            >
              <QrCode size={12} /> Or connect via MetaMask / WalletConnect QR
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-2">
          {connectors.map((connector) => {
            const isWc = connector.name === "WalletConnect" || connector.id === "walletConnect";
            return (
              <button
                key={connector.uid}
                type="button"
                onClick={() => {
                  setConnectError(null);
                  connect({ connector });
                }}
                disabled={isPending}
                className="flex items-center gap-3 px-3.5 py-2.5 border border-[#3A3A52] rounded-xl hover:border-[#C9A84C]/60 hover:bg-[#1A1A2E] transition text-left cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-[#1A1A2E] group-hover:bg-[#C9A84C]/10 border border-[#3A3A52] group-hover:border-[#C9A84C]/30 flex items-center justify-center shrink-0 text-[#C9A84C] transition">
                  {isWc ? <QrCode size={16} /> : <Wallet size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[#F5F3ED] text-xs font-semibold">{connector.name}</div>
                  <div className="text-[#5C5A70] text-[11px]">
                    {isWc ? "Scan QR with Mobile Wallet / MetaMask / Trust" : "Browser Extension (MetaMask, Coinbase)"}
                  </div>
                </div>
                {isPending && <Loader2 size={14} className="text-[#C9A84C] animate-spin shrink-0" />}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setManualMode(true)}
            className="mt-1 py-2 text-center text-xs text-[#C9A84C] hover:underline"
          >
            ← Back to manual address entry
          </button>
        </div>
      )}
    </div>
  );
}