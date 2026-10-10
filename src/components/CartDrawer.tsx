import React, { useState } from 'react';
import { CartItem } from '../types';
import { useSiteSettings } from './SiteSettingsContext';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
}) => {
  const settings = useSiteSettings();
  const [fulfillmentMethod, setFulfillmentMethod] = useState<'pickup' | 'delivery'>('pickup');
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [orderPlaced, setOrderPlaced] = useState(false);

  if (!isOpen) return null;

  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleWhatsAppCheckout = () => {
    if (items.length === 0) return;
    const itemListText = items
      .map(
        (it) =>
          `• ${it.title} (${it.storage}, ${it.color}, ${it.simVariant}) x${it.quantity} - ৳${(
            it.price * it.quantity
          ).toLocaleString('en-IN')}`
      )
      .join('%0A');

    const fulfillmentText =
      fulfillmentMethod === 'pickup'
        ? 'Theme Omar Plaza Showroom Pickup (Rajshahi)'
        : 'Rajshahi Metro Express Delivery (Inspect Before Payment)';

    const msg = `Hello ${settings.brandName},%0A%0AI would like to order the following:%0A${itemListText}%0A%0ATotal: ৳${totalAmount.toLocaleString(
      'en-IN'
    )}%0AFulfillment: ${fulfillmentText}${
      buyerName ? `%0ACustomer: ${buyerName} (${buyerPhone})` : ''
    }%0A%0APlease confirm physical stock availability.`;

    window.open(`https://wa.me/${settings.whatsAppNumber}?text=${msg}`, '_blank');
    setOrderPlaced(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#0b1c30]/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#ffffff] h-full shadow-2xl flex flex-col justify-between overflow-hidden border-l border-[#e2e8f0]">
        {/* Header */}
        <div className="p-6 bg-[#eff4ff] border-b border-[#e2e8f0] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[24px] text-[#004ac6]">shopping_bag</span>
            <div>
              <h2 className="text-[18px] font-bold text-[#0b1c30]">Your Device Bag</h2>
              <span className="text-[12px] text-[#434655]">
                {items.length} {items.length === 1 ? 'item' : 'items'} ready for inspection
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#e5eeff] text-[#434655] hover:text-[#0b1c30] transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Item List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 text-[#434655]">
              <div className="w-16 h-16 rounded-full bg-[#eff4ff] flex items-center justify-center text-[#004ac6] mb-4">
                <span className="material-symbols-outlined text-[32px]">production_quantity_limits</span>
              </div>
              <p className="text-[16px] font-semibold text-[#0b1c30]">Your bag is currently empty</p>
              <p className="text-[13px] text-[#434655] max-w-xs mt-1">
                Explore our authentic iPhone and Android flagship inventory to reserve or order.
              </p>
            </div>
          ) : (
            <>
              {orderPlaced && (
                <div className="p-4 rounded-xl bg-[#bdffdb]/40 border border-[#007d55]/30 text-[#006242] flex items-start gap-3">
                  <span className="material-symbols-outlined text-[22px] shrink-0">check_circle</span>
                  <div className="text-[13px]">
                    <p className="font-bold">Reservation inquiry sent to WhatsApp!</p>
                    <p className="text-[12px] text-[#434655] mt-0.5">
                      Our customer desk at Theme Omar Plaza will reply within 5 minutes.
                    </p>
                  </div>
                </div>
              )}

              {items.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-[#eff4ff] border border-[#e2e8f0] flex gap-3.5 items-center justify-between"
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-14 h-14 object-contain rounded-lg bg-white p-1 shrink-0 border border-[#e2e8f0]"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[13px] font-bold text-[#0b1c30] truncate">{item.title}</h4>
                    <p className="text-[11px] text-[#434655]">
                      {item.storage} • {item.color}
                    </p>
                    <span className="text-[11px] text-[#004ac6] font-medium block">
                      {item.simVariant}
                    </span>
                    <p className="text-[14px] font-bold text-[#0b1c30] mt-1">
                      ৳{(item.price * item.quantity).toLocaleString('en-IN')}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="flex items-center gap-1.5 bg-white px-2 py-0.5 rounded-lg border border-[#e2e8f0]">
                      <button
                        onClick={() => onUpdateQuantity(item.id, -1)}
                        className="text-sm font-bold text-[#434655] hover:text-[#0b1c30] px-1"
                      >
                        −
                      </button>
                      <span className="text-[12px] font-bold w-4 text-center">{item.quantity}</span>
                      <button
                        onClick={() => onUpdateQuantity(item.id, 1)}
                        className="text-sm font-bold text-[#434655] hover:text-[#0b1c30] px-1"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="text-[#ba1a1a] text-[11px] hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}

              {/* Fulfillment Method Selection */}
              <div className="pt-2 space-y-2">
                <label className="text-[12px] font-bold uppercase tracking-wider text-[#0b1c30]">
                  Fulfillment Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFulfillmentMethod('pickup')}
                    className={`p-3 rounded-xl text-left border transition-all ${
                      fulfillmentMethod === 'pickup'
                        ? 'border-[#004ac6] bg-[#e5eeff] text-[#004ac6] font-semibold ring-1 ring-[#004ac6]'
                        : 'border-[#e2e8f0] bg-white text-[#434655] hover:bg-[#eff4ff]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-[12px]">
                      <span className="material-symbols-outlined text-[16px]">storefront</span>
                      <span>Store Pickup</span>
                    </div>
                    <span className="text-[10px] text-[#434655] block mt-1">Theme Omar Plaza</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFulfillmentMethod('delivery')}
                    className={`p-3 rounded-xl text-left border transition-all ${
                      fulfillmentMethod === 'delivery'
                        ? 'border-[#004ac6] bg-[#e5eeff] text-[#004ac6] font-semibold ring-1 ring-[#004ac6]'
                        : 'border-[#e2e8f0] bg-white text-[#434655] hover:bg-[#eff4ff]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-[12px]">
                      <span className="material-symbols-outlined text-[16px]">local_shipping</span>
                      <span>Rajshahi Express</span>
                    </div>
                    <span className="text-[10px] text-[#434655] block mt-1">Inspect Before Pay</span>
                  </button>
                </div>
              </div>

              {/* Optional Quick Contact */}
              <div className="pt-1 space-y-1.5">
                <input
                  type="text"
                  placeholder="Your Name (Optional)"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-[#eff4ff] text-[12px] border border-[#e2e8f0] focus:outline-none focus:ring-1 focus:ring-[#004ac6]"
                />
                <input
                  type="tel"
                  placeholder="WhatsApp Mobile Number"
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-[#eff4ff] text-[12px] border border-[#e2e8f0] focus:outline-none focus:ring-1 focus:ring-[#004ac6]"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-6 bg-[#ffffff] border-t border-[#e2e8f0] space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] text-[#434655]">Total Amount (BDT)</span>
              <span className="text-[22px] font-bold text-[#004ac6]">
                ৳{totalAmount.toLocaleString('en-IN')}
              </span>
            </div>

            <button
              onClick={handleWhatsAppCheckout}
              className="w-full py-3.5 px-4 rounded-xl bg-[#007d55] hover:bg-[#006242] text-white font-semibold text-[15px] flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">chat</span>
              <span>Checkout via WhatsApp</span>
            </button>

            <div className="flex items-center justify-between text-[11px] text-[#434655] pt-1">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] text-[#007d55]">verified</span>
                Physical check allowed
              </span>
              <button onClick={onClearCart} className="text-[#ba1a1a] hover:underline">
                Clear Bag
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
