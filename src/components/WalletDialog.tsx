import React, { useState } from 'react';
import { CreditCard, DollarSign, ArrowUpRight, Check, ShieldAlert, Sparkles, Loader2 } from 'lucide-react';

interface WalletDialogProps {
  balance: number;
  displayName: string;
  onDeposit: (amount: number) => Promise<void>;
  onClose: () => void;
}

export const WalletDialog: React.FC<WalletDialogProps> = ({
  balance,
  displayName,
  onDeposit,
  onClose,
}) => {
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cardName, setCardName] = useState<string>(displayName || 'CHESS LEGEND');
  const [cardNumber, setCardNumber] = useState<string>('4000 1234 5678 9010');
  const [cardExpiry, setCardExpiry] = useState<string>('12/29');
  const [cardCvv, setCardCvv] = useState<string>('777');

  const handlePresetDeposit = async (amt: number) => {
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      // Fake delays to simulate card authorizations
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await onDeposit(amt);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Deposit simulation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCustomDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(customAmount);
    if (isNaN(parsed) || parsed <= 0) {
      setErrorMsg('Please specify a positive amount to deposit.');
      return;
    }
    await handlePresetDeposit(parsed);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-gray-800 rounded-2xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl animate-in fade-in duration-200">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-amber-950 px-6 py-4 flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
            <h3 className="font-display font-bold text-lg text-amber-500">Gold Sovereign Ledger</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition font-bold text-lg p-1"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[85vh]">
          {success ? (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500 rounded-full flex items-center justify-center animate-bounce">
                <Check className="w-10 h-10 text-emerald-500" />
              </div>
              <h4 className="font-display font-bold text-xl text-emerald-400">Funds Transferred Successfully</h4>
              <p className="text-sm text-gray-400">
                Your sandbox virtual ledger balance was credited. Happy betting!
              </p>
            </div>
          ) : (
            <>
              {/* Virtual balance card summary */}
              <div className="flex justify-between items-center p-4 bg-slate-900/60 border border-gray-800 rounded-xl">
                <div>
                  <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">Available Credit</span>
                  <div className="text-2xl font-mono font-bold text-emerald-400 flex items-center mt-1">
                    <span className="mr-1 text-xl">₦</span>
                    {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg text-xs font-mono text-amber-500">
                  Virtual Cash System
                </div>
              </div>

              {/* Dynamic Styled Credit Card Visualiser */}
              <div className="relative h-48 w-full bg-gradient-to-br from-amber-600 via-yellow-700 to-amber-950 border border-amber-500/30 rounded-2xl p-6 flex flex-col justify-between shadow-lg text-white overflow-hidden">
                <div className="absolute right-0 bottom-0 top-0 w-2/3 bg-radial from-amber-500/10 to-transparent pointer-events-none" />
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs uppercase tracking-widest text-amber-200">Vault Card</span>
                    <div className="w-10 h-8 bg-gradient-to-tr from-amber-300 to-yellow-500 rounded-md mt-2 flex items-center justify-center opacity-90 border border-amber-200">
                      {/* Sim Chip Outline */}
                      <span className="w-6 h-4 border border-amber-700 rounded-sm opacity-60" />
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 font-display font-extrabold text-[#ECECD7] text-lg italic bg-slate-900/40 px-3 py-1 rounded-md">
                    <span>VAULT</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="font-mono text-lg tracking-widest font-semibold text-amber-50">
                    {cardNumber}
                  </div>
                  <div className="flex justify-between text-xs font-mono uppercase text-amber-200">
                    <div>
                      <span className="text-[9px] block text-amber-300">CARDHOLDER</span>
                      <span>{cardName}</span>
                    </div>
                    <div className="flex space-x-4">
                      <div>
                        <span className="text-[9px] block text-amber-300">EXPLIMIT</span>
                        <span>{cardExpiry}</span>
                      </div>
                      <div>
                        <span className="text-[9px] block text-amber-300">KEYCVV</span>
                        <span>{cardCvv}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Presets and custom forms */}
              <div className="space-y-3">
                <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">Select Sandbox Fuel Amount</span>
                <div className="grid grid-cols-3 gap-3">
                  {[50, 200, 1000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handlePresetDeposit(preset)}
                      className="py-2 px-4 bg-slate-900 border border-gray-800 hover:border-amber-500/50 hover:bg-slate-800 transition rounded-xl text-sm font-bold font-mono text-gray-200 flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <PlusIcon className="w-3.5 h-3.5 text-amber-500" />
                      ₦{preset}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleCustomDeposit} className="space-y-3 pt-2">
                <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">Custom Deposit Amount</span>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2.5 text-gray-500 font-mono">₦</span>
                    <input
                      type="number"
                      value={customAmount}
                      disabled={isProcessing}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder="Enter custom amount"
                      className="w-full bg-slate-900 border border-gray-800 rounded-xl py-2.5 pl-7 pr-4 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="bg-amber-600 hover:bg-amber-500 transition text-slate-900 px-5 font-bold rounded-xl text-sm flex items-center gap-1 cursor-pointer disabled:bg-gray-700 disabled:text-gray-400"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Deposit
                        <ArrowUpRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {errorMsg && (
                <div className="flex gap-2 p-3 bg-red-950/20 border border-red-900/50 text-red-500 text-xs rounded-xl items-center">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-950/40 border-t border-gray-900 flex justify-between items-center text-[10px] font-mono text-gray-400">
          <span>SECURE SANDBOX TRANSFERS Only</span>
          <span>NO APIS CHARGED</span>
        </div>
      </div>
    </div>
  );
};

// Simple plus icon for consistency
const PlusIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);
