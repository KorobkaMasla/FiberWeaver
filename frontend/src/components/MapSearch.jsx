import React, { useState, useRef, useEffect } from 'react';
import { forwardGeocode } from './mapEditorUtils';

function MapSearch({ onLocationSelect }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const [error, setError] = useState('');
  const searchRef = useRef(null);
  const inputRef = useRef(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const trimmedQuery = searchQuery.trim();

    if (!trimmedQuery) {
      setSuggestions([]);
      setShowSuggestions(false);
      setLoading(false);
      setNoResults(false);
      setError('');
      return;
    }

    const controller = new AbortController();
    requestIdRef.current += 1;
    const currentRequestId = requestIdRef.current;

    const timer = setTimeout(async () => {
      setLoading(true);
      setError('');
      setNoResults(false);

      try {
        const results = await forwardGeocode(trimmedQuery, controller.signal);

        if (requestIdRef.current !== currentRequestId) {
          return;
        }

        const uniqueResults = [];
        const seen = new Set();

        for (const result of results) {
          const key = result.display_name;
          if (!seen.has(key)) {
            seen.add(key);
            uniqueResults.push(result);
          }
        }

        setSuggestions(uniqueResults);
        setNoResults(uniqueResults.length === 0);
        setShowSuggestions(true);
      } catch (err) {
        if (err.name === 'AbortError' || requestIdRef.current !== currentRequestId) {
          return;
        }

        setSuggestions([]);
        setNoResults(false);
        setError('Не удалось загрузить результаты');
        setShowSuggestions(true);
      } finally {
        if (requestIdRef.current === currentRequestId) {
          setLoading(false);
        }
      }
    }, 200);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e) => {
    // Предотвращаем распространение события пробела чтобы карта не обработала его
    if (e.code === 'Space') {
      e.stopPropagation();
    }
  };

  const handleSelectLocation = (location) => {
    setSearchQuery(location.display_name);
    setSuggestions([]);
    setShowSuggestions(false);
    setNoResults(false);
    setError('');
    onLocationSelect({
      lat: location.lat,
      lon: location.lon,
      address: location.display_name
    });
  };

  return (
    <div className="map-search-container" ref={searchRef}>
      <div className="map-search-input-wrapper">
        <input
          ref={inputRef}
          type="text"
          placeholder="Поиск местоположения..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0 || noResults || error) {
              setShowSuggestions(true);
            }
          }}
          className="map-search-input"
        />
        {loading && (
          <div className="map-search-loader">
            <span className="search-spinner">⟳</span>
          </div>
        )}

        {showSuggestions && (
          <div className="map-search-dropdown">
            {error && !loading && (
              <div className="map-search-feedback error">{error}</div>
            )}

            {!error && noResults && !loading && (
              <div className="map-search-feedback">Ничего не найдено</div>
            )}

            {suggestions.map((location, idx) => {
              const [primary, ...rest] = location.display_name.split(',').map((part) => part.trim());
              const secondary = rest.join(', ');

              return (
                <div
                  key={`${location.lat}-${location.lon}-${idx}`}
                  className="map-search-item"
                  onClick={() => handleSelectLocation(location)}
                  title={location.display_name}
                >
                  <span className="search-icon"></span>
                  <div className="search-text">
                    <span className="search-primary">{primary}</span>
                    {secondary && (
                      <span className="search-secondary">{secondary}</span>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && suggestions.length === 0 && (
              <div className="map-search-feedback">Идёт поиск…</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default MapSearch;
