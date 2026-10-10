import React, { useEffect, useState } from 'react';
import { ImageUploadField } from './ImageUploadField';
import { LiveEditMap, LiveEditValue, ProductImage } from '../types';

interface LiveEditorPage {
  tab: string;
  label: string;
  path: string;
}

interface LiveEditorOverlayProps {
  enabled: boolean;
  isDirty: boolean;
  isSaving: boolean;
  routeKey: string;
  edits: LiveEditMap;
  pages: LiveEditorPage[];
  onToggle: () => void;
  onChange: (edits: LiveEditMap) => void;
  onSave: () => void;
  onNavigate: (tab: string, path: string) => void;
}

const createSelector = (element: Element) => {
  const parts: string[] = [];
  let current: Element | null = element;
  while (current && current.tagName.toLowerCase() !== 'body') {
    if (current.id) {
      parts.unshift(`#${CSS.escape(current.id)}`);
      break;
    }
    const tag = current.tagName.toLowerCase();
    const siblings = Array.from(current.parentElement?.children || []).filter((sibling) => sibling.tagName === current?.tagName);
    parts.unshift(`${tag}:nth-of-type(${siblings.indexOf(current) + 1})`);
    current = current.parentElement;
  }
  return parts.join(' > ');
};

const editKey = (route: string, selector: string) => `${route}|${selector}`;

export const LiveEditorOverlay: React.FC<LiveEditorOverlayProps> = ({
  enabled,
  isDirty,
  isSaving,
  routeKey,
  edits,
  pages,
  onToggle,
  onChange,
  onSave,
  onNavigate,
}) => {
  const [selected, setSelected] = useState<LiveEditValue | null>(null);

  useEffect(() => {
    setSelected(null);
    for (const edit of Object.values(edits)) {
      if (edit.route !== routeKey) continue;
      const element = document.querySelector(edit.selector);
      if (!element) continue;
      if (edit.kind === 'image' && element instanceof HTMLImageElement) element.src = edit.value;
      else if (edit.kind === 'text') element.textContent = edit.value;
    }
  }, [routeKey, edits]);

  useEffect(() => {
    if (!enabled) return;
    const selectElement = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || target.closest('[data-live-editor-ui="true"]')) return;
      const image = target.closest('img');
      const element = image || target.closest('h1,h2,h3,h4,h5,p,a,button,li,span,strong,small,label');
      if (!element || element.closest('[data-live-editor-ui="true"]')) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const selector = createSelector(element);
      const kind = element instanceof HTMLImageElement ? 'image' : 'text';
      const saved = edits[editKey(routeKey, selector)];
      const value = saved?.value ?? (kind === 'image' ? element.getAttribute('src') || '' : element.textContent?.trim() || '');
      const settingKey = kind === 'image' && /logo/i.test(element.getAttribute('alt') || '')
        ? 'logoUrl'
        : undefined;
      setSelected({ route: routeKey, selector, kind, value, settingKey: saved?.settingKey || settingKey });
    };
    document.addEventListener('click', selectElement, true);
    return () => document.removeEventListener('click', selectElement, true);
  }, [enabled, edits, routeKey]);

  const updateSelected = (kind: LiveEditValue['kind'], value: string) => {
    if (!selected) return;
    const next = { ...selected, kind, value };
    const element = document.querySelector(selected.selector);
    if (element) {
      if (kind === 'image' && element instanceof HTMLImageElement) element.src = value;
      else if (kind === 'text') element.textContent = value;
    }
    setSelected(next);
    onChange({ ...edits, [editKey(routeKey, selected.selector)]: next });
  };

  const selectedImages: ProductImage[] = selected?.kind === 'image' && selected.value
    ? [{ src: selected.value, label: 'Selected site image', alt: 'Selected site image' }]
    : [];

  return (
    <>
      <button
        data-live-editor-ui="true"
        onClick={onToggle}
        className="fixed bottom-6 right-6 z-[80] inline-flex items-center gap-2 rounded-lg bg-[#0b1c30] px-4 py-3 text-[13px] font-semibold text-white shadow-xl hover:bg-[#243b57]"
      >
        <span className="material-symbols-outlined text-[18px]">{enabled ? 'close' : 'edit'}</span>
        {enabled ? 'Exit Live Editor' : 'Edit Site Content'}
      </button>

      {enabled && (
        <aside data-live-editor-ui="true" className="fixed right-6 bottom-24 z-[80] w-[min(420px,calc(100vw-3rem))] max-h-[70vh] overflow-y-auto rounded-xl border border-[#c3c6d7] bg-white p-4 shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[16px] font-bold text-[#0b1c30]">Live Site Editor</h2>
              <p className="text-[11px] text-[#565e74] mt-0.5">Select text or an image on this page to edit it.</p>
            </div>
            <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${isDirty ? 'bg-[#fff0d0] text-[#815500]' : 'bg-[#e2f5eb] text-[#006242]'}`}>{isDirty ? 'Unsaved changes' : 'Saved'}</span>
          </div>

          <nav aria-label="Pages in live editor" className="mt-4 flex flex-wrap gap-1.5 border-b border-[#e2e8f0] pb-3">
            {pages.map((page) => (
              <button key={page.tab} onClick={() => onNavigate(page.tab, page.path)} className={`rounded px-2.5 py-1.5 text-[11px] font-semibold ${routeKey === page.tab ? 'bg-[#004ac6] text-white' : 'bg-[#eff4ff] text-[#0b1c30] hover:bg-[#e5eeff]'}`}>
                {page.label}
              </button>
            ))}
          </nav>

          {selected ? (
            <div className="mt-4 space-y-3">
              <p className="text-[11px] font-semibold uppercase text-[#565e74]">Selected {selected.kind === 'image' ? 'image' : 'text'} · {selected.route}</p>
              {selected.kind === 'image' ? (
                <ImageUploadField label="Replace selected image" images={selectedImages} onChange={(images) => updateSelected('image', images[0]?.src || '')} />
              ) : (
                <label className="block text-[12px] font-semibold text-[#0b1c30]">Inline text
                  <textarea rows={4} value={selected.value} onChange={(event) => updateSelected('text', event.target.value)} className="mt-1 w-full rounded-lg border border-[#d4d9e5] bg-[#f8f9ff] p-3 text-[13px] font-normal text-[#0b1c30]" />
                </label>
              )}
              <button onClick={() => setSelected(null)} className="text-[11px] font-semibold text-[#004ac6] hover:underline">Clear selection</button>
            </div>
          ) : (
            <p className="mt-4 rounded-lg bg-[#f8f9ff] p-3 text-[12px] text-[#565e74]">Click a heading, paragraph, button label, or image on the page to edit its content.</p>
          )}

          <div className="mt-4 flex justify-end border-t border-[#e2e8f0] pt-3">
            <button disabled={!isDirty || isSaving} onClick={onSave} className="rounded-lg bg-[#004ac6] px-4 py-2 text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{isSaving ? 'Saving…' : 'Save Changes'}</button>
          </div>
        </aside>
      )}
    </>
  );
};
