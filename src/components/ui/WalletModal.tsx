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
    <div className="fixed inset-0 bg-[#2c231c]/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-[#faf5eb] border-2 border-[#d6c5ad] rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden text-[#2c231c] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-[#d6c5ad] bg-[#f4ebe1] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#fdeed9] text-[#c85a2b] border border-[#f0c8a5]">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#2c231c]">Dompet & Top Up Poin</h2>
              <p className="text-xs text-[#786653]">Gunakan poin untuk merekrut AI Agent & langganan token</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#786653] hover:text-[#2c231c] hover:bg-[#ede2d1] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Balance Banner */}
        <div className="p-5 bg-[#fffdf9] border-b border-[#d6c5ad] flex items-center justify-between">
          <div>
            <div className="text-xs text-[#786653] font-semibold">Saldo Poin Akun Anda</div>
            <div className="text-2xl font-black font-mono text-[#ab7a1a] flex items-center gap-2">
              <span suppressHydrationWarning>🪙 {formatNumber(userAccount.pointsBalance)}</span>
              <span className="text-xs font-bold text-[#786653]">PTS</span>
            </div>
          </div>
          <div className="text-right text-xs text-[#786653] font-mono">
            <div className="font-bold text-[#2c231c]">{userAccount.name}</div>
            <div className="text-[10px] text-[#9c8976]">{userAccount.email}</div>
          </div>
        </div>

        {successMsg ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-[#e6f4f2] text-[#1f6860] border border-[#a2d8d0] flex items-center justify-center mx-auto text-2xl font-bold">
              ✓
            </div>
            <h3 className="text-lg font-bold text-[#2c231c]">Top Up Berhasil!</h3>
            <p className="text-xs text-[#1f6860] font-semibold">{successMsg}</p>
          </div>
        ) : (
          <div className="p-6 space-y-5 text-xs overflow-y-auto">
            {/* Packages */}
            <div>
              <div className="font-semibold text-[#2c231c] mb-2.5 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#c85a2b]" />
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
                          ? 'bg-[#fdeed9] border-2 border-[#c85a2b] shadow-xs'
                          : 'bg-[#fffdf9] border-[#d6c5ad] hover:border-[#c85a2b]'
                      }`}
                    >
                      {pkg.isPopular && (
                        <span className="absolute -top-2.5 right-3 bg-[#c85a2b] text-white font-bold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                          Populer
                        </span>
                      )}
                      <div>
                        <div className="font-bold text-[#2c231c] text-sm mb-1">{pkg.name}</div>
                        <div className="text-lg font-black font-mono text-[#ab7a1a]" suppressHydrationWarning>
                          +{formatNumber(pkg.points)} PTS
                        </div>
                      </div>
                      <div className="pt-3 mt-2 border-t border-[#d6c5ad] font-bold text-[#2c231c]">
                        Rp {formatNumber(pkg.priceIdr)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <div className="font-semibold text-[#2c231c] mb-2">Metode Pembayaran:</div>
              <div className="grid grid-cols-2 gap-2">
                <label
                  onClick={() => setPaymentMethod('qris')}
                  className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2.5 transition-colors ${
                    paymentMethod === 'qris'
                      ? 'bg-[#fdeed9] border-2 border-[#c85a2b] text-[#2c231c] font-bold'
                      : 'bg-[#fffdf9] border-[#d6c5ad] text-[#615042] hover:border-[#c85a2b]'
                  }`}
                >
                  <QrCode className="w-4 h-4 text-[#288279]" />
                  <span className="text-xs">QRIS (Gopay / OVO / Dana)</span>
                </label>

                <label
                  onClick={() => setPaymentMethod('bca_va')}
                  className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2.5 transition-colors ${
                    paymentMethod === 'bca_va'
                      ? 'bg-[#fdeed9] border-2 border-[#c85a2b] text-[#2c231c] font-bold'
                      : 'bg-[#fffdf9] border-[#d6c5ad] text-[#615042] hover:border-[#c85a2b]'
                  }`}
                >
                  <Building className="w-4 h-4 text-[#2d4263]" />
                  <span className="text-xs">BCA Virtual Account</span>
                </label>

                <label
                  onClick={() => setPaymentMethod('mandiri')}
                  className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2.5 transition-colors ${
                    paymentMethod === 'mandiri'
                      ? 'bg-[#fdeed9] border-2 border-[#c85a2b] text-[#2c231c] font-bold'
                      : 'bg-[#fffdf9] border-[#d6c5ad] text-[#615042] hover:border-[#c85a2b]'
                  }`}
                >
                  <Building className="w-4 h-4 text-[#ab7a1a]" />
                  <span className="text-xs">Mandiri Livin</span>
                </label>

                <label
                  onClick={() => setPaymentMethod('cc')}
                  className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2.5 transition-colors ${
                    paymentMethod === 'cc'
                      ? 'bg-[#fdeed9] border-2 border-[#c85a2b] text-[#2c231c] font-bold'
                      : 'bg-[#fffdf9] border-[#d6c5ad] text-[#615042] hover:border-[#c85a2b]'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-[#7d3b8f]" />
                  <span className="text-xs">Kartu Debit / Kredit</span>
                </label>
              </div>
            </div>

            {/* Total & Checkout */}
            <div className="pt-2 border-t border-[#d6c5ad] flex items-center justify-between">
              <div>
                <div className="text-[11px] text-[#786653]">Total Pembayaran</div>
                <div className="text-base font-bold text-[#2c231c]" suppressHydrationWarning>
                  Rp {formatNumber(selectedPackage.priceIdr)}
                </div>
              </div>

              <button
                onClick={handlePay}
                disabled={isProcessing}
                className="px-6 py-2.5 bg-[#c85a2b] hover:bg-[#b54d22] text-white font-bold rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
