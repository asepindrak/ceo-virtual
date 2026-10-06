'use client';

import React, { useState } from 'react';
import { UserAccount, PaymentPackage } from '@/types/office';
import { PAYMENT_PACKAGES } from '@/lib/marketplaceData';
import { formatNumber } from '@/lib/utils';
import { X, CreditCard, Sparkles, Check, QrCode, Building, ShieldCheck } from 'lucide-react';
import confetti from 'canvas-confetti';

interface WalletModalProps {
  userAccount: UserAccount;
  onClose: () => void;
  onTopUpSuccess: (addedPoints: number) => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({
  userAccount,
  onClose,
  onTopUpSuccess,
}) => {
  const [selectedPackage, setSelectedPackage] = useState<PaymentPackage>(PAYMENT_PACKAGES[1]);
  const [paymentMethod, setPaymentMethod] = useState<'qris' | 'bca_va' | 'mandiri' | 'cc'>('qris');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handlePay = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      onTopUpSuccess(selectedPackage.points);
      confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } });
      setSuccessMsg(
        `Pembayaran Berhasil! +${formatNumber(selectedPackage.points)} PTS telah ditambahkan ke saldo Anda.`
      );
      setTimeout(() => {
        onClose();
      }, 1500);
    }, 800);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden text-slate-100 flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Dompet & Top Up Poin</h2>
              <p className="text-xs text-slate-400">Gunakan poin untuk merekrut AI Agent & langganan token</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Balance Banner */}
        <div className="p-5 bg-gradient-to-r from-amber-950/40 via-slate-950 to-indigo-950/40 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">Saldo Poin Akun Anda</div>
            <div className="text-2xl font-black font-mono text-amber-300 flex items-center gap-2">
              <span suppressHydrationWarning>🪙 {formatNumber(userAccount.pointsBalance)}</span>
              <span className="text-xs font-normal text-slate-400">PTS</span>
            </div>
          </div>
          <div className="text-right text-xs text-slate-400 font-mono">
            <div>{userAccount.name}</div>
            <div className="text-[10px] text-slate-500">{userAccount.email}</div>
          </div>
        </div>

        {successMsg ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto text-2xl">
              ✓
            </div>
            <h3 className="text-lg font-bold text-white">Top Up Berhasil!</h3>
            <p className="text-xs text-emerald-300 font-medium">{successMsg}</p>
          </div>
        ) : (
          <div className="p-6 space-y-5 text-xs overflow-y-auto">
            {/* Packages */}
            <div>
              <div className="font-semibold text-slate-200 mb-2.5 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Pilih Paket Poin:
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {PAYMENT_PACKAGES.map((pkg) => {
                  const isSelected = selectedPackage.id === pkg.id;
                  return (
                    <div
                      key={pkg.id}
                      onClick={() => setSelectedPackage(pkg)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all relative flex flex-col justify-between ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-500 ring-2 ring-amber-500/30'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {pkg.isPopular && (
                        <span className="absolute -top-2.5 right-3 bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow">
                          Populer
                        </span>
                      )}
                      <div>
                        <div className="font-bold text-slate-100 text-sm mb-1">{pkg.name}</div>
                        <div className="text-lg font-black font-mono text-amber-300" suppressHydrationWarning>
                          +{formatNumber(pkg.points)} PTS
                        </div>
                      </div>
                      <div className="pt-3 mt-2 border-t border-slate-800/80 font-semibold text-white">
                        Rp {formatNumber(pkg.priceIdr)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <div className="font-semibold text-slate-200 mb-2">Metode Pembayaran:</div>
              <div className="grid grid-cols-2 gap-2">
                <label
                  onClick={() => setPaymentMethod('qris')}
                  className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2.5 transition-colors ${
                    paymentMethod === 'qris'
                      ? 'bg-indigo-500/20 border-indigo-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <QrCode className="w-4 h-4 text-emerald-400" />
                  <span className="font-medium text-xs">QRIS (Gopay / OVO / Dana)</span>
                </label>

                <label
                  onClick={() => setPaymentMethod('bca_va')}
                  className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2.5 transition-colors ${
                    paymentMethod === 'bca_va'
                      ? 'bg-indigo-500/20 border-indigo-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Building className="w-4 h-4 text-blue-400" />
                  <span className="font-medium text-xs">BCA Virtual Account</span>
                </label>

                <label
                  onClick={() => setPaymentMethod('mandiri')}
                  className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2.5 transition-colors ${
                    paymentMethod === 'mandiri'
                      ? 'bg-indigo-500/20 border-indigo-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Building className="w-4 h-4 text-amber-400" />
                  <span className="font-medium text-xs">Mandiri Livin</span>
                </label>

                <label
                  onClick={() => setPaymentMethod('cc')}
                  className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2.5 transition-colors ${
                    paymentMethod === 'cc'
                      ? 'bg-indigo-500/20 border-indigo-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-purple-400" />
                  <span className="font-medium text-xs">Kartu Debit / Kredit</span>
                </label>
              </div>
            </div>

            {/* Total & Checkout */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[11px] text-slate-400">Total Pembayaran</div>
                <div className="text-base font-bold text-white" suppressHydrationWarning>
                  Rp {formatNumber(selectedPackage.priceIdr)}
                </div>
              </div>

              <button
                onClick={handlePay}
                disabled={isProcessing}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-bold rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Memproses Transaksi...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Bayar & Top Up Instan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
