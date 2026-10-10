import React, { useState } from 'react';
import { Product } from '../types';

interface InquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  selectedStorage: string;
  selectedColor: string;
  selectedSim: string;
  currentPrice: number;
  onSubmitSuccess: (inquiryData: { name: string; phone: string; fulfillment: string }) => void;
}

export const InquiryModal: React.FC<InquiryModalProps> = ({
  isOpen,
  onClose,
  product,
  selectedStorage,
  selectedColor,
  selectedSim,
  currentPrice,
  onSubmitSuccess,
}) => {
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [fulfillment, setFulfillment] = useState('store-pickup');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      onSubmitSuccess({
        name: fullName,
        phone: '+880' + phoneNumber,
        fulfillment,
      });
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0b1c30]/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#ffffff] rounded-2xl shadow-2xl overflow-hidden border border-[#e2e8f0]/80 transform transition-all">
        {/* Header */}
        <div className="p-6 bg-[#e5eeff] flex items-center justify-between border-b border-[#c3c6d7]/40">
          <div>
            <h3 className="text-[20px] text-[#0b1c30] font-semibold tracking-tight">
              Device Reservation Inquiry
            </h3>
            <p className="text-[12px] text-[#434655]">
              Hold an in-stock unit for 24 hours at Theme Omar Plaza
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#ffffff] hover:bg-[#eff4ff] flex items-center justify-center text-[#0b1c30] transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Selected Summary Snapshot */}
          <div className="p-3.5 rounded-xl bg-[#eff4ff] flex items-center justify-between border border-[#e2e8f0]">
            <div>
              <p className="text-[13px] font-bold text-[#0b1c30]">
                {product.model} <span className="text-[#004ac6]">{selectedStorage}</span>
              </p>
              <p className="text-[12px] text-[#434655]">
                {selectedColor} • {selectedSim}
              </p>
            </div>
            <p className="text-[20px] text-[#004ac6] font-bold">
              ৳{currentPrice.toLocaleString('en-IN')}
            </p>
          </div>

          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-[13px] text-[#0b1c30] font-semibold block">
              Full Name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Tanvir Ahmed"
              className="w-full h-11 px-3.5 rounded-lg bg-[#eff4ff] text-[#0b1c30] text-[14px] focus:outline-none focus:bg-[#ffffff] focus:ring-2 focus:ring-[#2563eb] border border-[#c3c6d7]/50"
            />
          </div>

          {/* Phone Number */}
          <div className="space-y-1.5">
            <label className="text-[13px] text-[#0b1c30] font-semibold block">
              Phone Number (with WhatsApp)
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-lg bg-[#e5eeff] text-[#434655] text-[13px] font-semibold border border-r-0 border-[#c3c6d7]/50">
                +880
              </span>
              <input
                type="tel"
                required
                maxLength={10}
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="1712345678"
                className="w-full h-11 px-3.5 rounded-r-lg bg-[#eff4ff] text-[#0b1c30] text-[14px] focus:outline-none focus:bg-[#ffffff] focus:ring-2 focus:ring-[#2563eb] border border-[#c3c6d7]/50 font-mono"
              />
            </div>
          </div>

          {/* Fulfillment Preference */}
          <div className="space-y-1.5">
            <label className="text-[13px] text-[#0b1c30] font-semibold block">
              Fulfillment Preference
            </label>
            <select
              value={fulfillment}
              onChange={(e) => setFulfillment(e.target.value)}
              className="w-full h-11 px-3.5 rounded-lg bg-[#eff4ff] text-[#0b1c30] text-[13px] focus:outline-none focus:bg-[#ffffff] focus:ring-2 focus:ring-[#2563eb] border border-[#c3c6d7]/50 cursor-pointer"
            >
              <option value="store-pickup">In-Store Pickup (Theme Omar Plaza, Rajshahi)</option>
              <option value="rajshahi-express">Rajshahi Metro Fast Delivery (Pay After Inspection)</option>
              <option value="nationwide-courier">All Bangladesh Courier (Steadfast / Sundarban Condition)</option>
            </select>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 rounded-xl bg-[#004ac6] hover:bg-[#2563eb] text-white font-semibold text-[16px] transition-all shadow-md mt-2 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="material-symbols-outlined text-[20px] animate-spin">refresh</span>
            ) : (
              <span className="material-symbols-outlined text-[20px]">send</span>
            )}
            <span>{isSubmitting ? 'Holding Unit...' : 'Submit Device Reservation'}</span>
          </button>

          <p className="text-[11px] text-center text-[#434655]">
            No advance payment required for in-store pickup reservations. Unit held strictly for 24 hours.
          </p>
        </form>
      </div>
    </div>
  );
};
