import React, { useMemo, useState } from 'react';
import { HappyCustomer } from '../types';

interface HappyCustomersPageProps {
  customers: HappyCustomer[];
  onNavigateHome: () => void;
}

export const HappyCustomersPage: React.FC<HappyCustomersPageProps> = ({ customers, onNavigateHome }) => {
  const [search, setSearch] = useState('');
  const [selectedModel, setSelectedModel] = useState('all');

  const models = useMemo(() => Array.from(new Set(customers.map((customer) => customer.phoneModel))).sort(), [customers]);
  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...customers]
      .filter((customer) => selectedModel === 'all' || customer.phoneModel === selectedModel)
      .filter((customer) => !query || [customer.customerName, customer.phoneModel, customer.review].some((value) => value.toLowerCase().includes(query)))
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
  }, [customers, search, selectedModel]);

  return (
    <div className="w-full bg-[#f8f9ff] min-h-screen">
      <header className="bg-white border-b border-[#e2e8f0]">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-12 py-8">
          <button onClick={onNavigateHome} className="text-[13px] text-[#004ac6] font-semibold hover:underline">← Back to Storefront</button>
          <p className="text-[11px] uppercase font-bold text-[#006242] tracking-wider mt-6">Verified delivery stories</p>
          <h1 className="text-[32px] font-bold text-[#0b1c30] mt-1">Happy Customers &amp; Delivery Proofs</h1>
          <p className="text-[14px] text-[#565e74] mt-2">Customer photos, phone models, and feedback from recent deliveries.</p>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-6 lg:px-12 py-8">
        <div className="flex flex-col sm:flex-row gap-3 mb-7">
          <label className="flex-1 text-[12px] font-semibold text-[#434655]">Search stories
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, phone model, or review" className="mt-1 w-full h-11 px-3 rounded-lg bg-white border border-[#d4d9e5] text-[13px] font-normal text-[#0b1c30]" />
          </label>
          <label className="sm:w-72 text-[12px] font-semibold text-[#434655]">Filter by phone model
            <select value={selectedModel} onChange={(event) => setSelectedModel(event.target.value)} className="mt-1 w-full h-11 px-3 rounded-lg bg-white border border-[#d4d9e5] text-[13px] font-normal text-[#0b1c30]">
              <option value="all">All phone models</option>
              {models.map((model) => <option key={model} value={model}>{model}</option>)}
            </select>
          </label>
        </div>

        <p className="text-[12px] text-[#565e74] mb-4">{filteredCustomers.length} {filteredCustomers.length === 1 ? 'story' : 'stories'}</p>
        {filteredCustomers.length === 0 ? (
          <div className="rounded-lg border border-[#e2e8f0] bg-white py-16 text-center">
            <span className="material-symbols-outlined text-[36px] text-[#8b90a0]">photo_library</span>
            <p className="text-[15px] font-semibold text-[#0b1c30] mt-2">No customer stories found</p>
            <p className="text-[13px] text-[#565e74] mt-1">Try another search or phone model.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredCustomers.map((customer) => (
              <article key={customer.id} className="overflow-hidden rounded-lg border border-[#e2e8f0] bg-white shadow-xs">
                <img width={640} height={480} src={customer.image} alt={`${customer.customerName} with ${customer.phoneModel}`} loading="lazy" className="h-64 w-full bg-[#eff4ff] object-cover" />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><h2 className="font-bold text-[#0b1c30]">{customer.customerName}</h2><p className="text-[12px] text-[#565e74] mt-0.5">{customer.phoneModel}</p></div>
                    <time dateTime={customer.createdAt} className="shrink-0 text-[10px] text-[#565e74]">{new Date(customer.createdAt).toLocaleDateString()}</time>
                  </div>
                  <div className="flex items-center text-[#d68b00] mt-3" aria-label={`${customer.rating} out of 5 stars`}>
                    {Array.from({ length: customer.rating }, (_, index) => <span key={index} className="material-symbols-outlined text-[17px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>)}
                  </div>
                  <p className="text-[13px] text-[#434655] leading-relaxed mt-2">{customer.review}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
