import React from 'react';

interface Props {
  query: string;
  searching: boolean;
  showAutocomplete: boolean;
  autocompleteItems: string[];
  inputRef: React.RefObject<HTMLInputElement | null>;
  placeholder: string;
  onQueryChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onAutocompleteSelect: (item: string) => void;
  setShowAutocomplete: (v: boolean) => void;
  onCameraOpen: () => void;
}

export default function SearchBar({ query, searching, showAutocomplete, autocompleteItems, inputRef, placeholder, onQueryChange, onSubmit, onAutocompleteSelect, setShowAutocomplete, onCameraOpen }: Props) {
  return (
    <form className="search-container" onSubmit={onSubmit} style={{ position: 'relative' }}>
      <div className="search-box">
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          placeholder={placeholder}
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          onFocus={() => { if (autocompleteItems.length > 0) setShowAutocomplete(true); }}
          onBlur={() => setTimeout(() => setShowAutocomplete(false), 150)}
          onKeyDown={e => { if (e.key === 'Escape') setShowAutocomplete(false); }}
          autoComplete="off"
        />
        <button type="button" className="camera-btn" onClick={onCameraOpen} aria-label="Scanner">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </button>
        <button type="submit" className="search-btn" disabled={searching} aria-label="Rechercher">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
        </button>
      </div>
      {showAutocomplete && autocompleteItems.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: 'rgba(10,10,24,0.98)', backdropFilter: 'blur(24px)',
          border: '1px solid rgba(139,38,53,0.2)',
          borderRadius: '0 0 14px 14px', overflow: 'hidden', marginTop: 2,
          maxHeight: '300px', overflowY: 'auto',
          boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
        }}>
          {autocompleteItems.map((item, i) => (
            <button key={i} type="button"
              onMouseDown={() => onAutocompleteSelect(item)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '10px 18px', background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-2)', fontSize: '0.88rem', textAlign: 'left',
                borderBottom: i < autocompleteItems.length - 1 ? '1px solid rgba(139,38,53,0.08)' : 'none',
                fontFamily: 'Inter, sans-serif', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,38,53,0.1)'; e.currentTarget.style.color = 'var(--text-1)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-2)'; }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(139,38,53,0.5)" strokeWidth="2">
                <polyline points="9 10 4 15 9 20" /><path d="M20 4v7a4 4 0 01-4 4H4" />
              </svg>
              {item}
            </button>
          ))}
        </div>
      )}
    </form>
  );
}
