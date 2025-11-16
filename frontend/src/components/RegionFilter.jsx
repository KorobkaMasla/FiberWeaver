import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import './RegionFilter.css';
import { 
  createRegion, 
  loadObjectsByCity, 
  loadCablesByCity 
} from '../services/regionService';

const API_BASE = 'http://localhost:8000/api';

const RegionFilter = forwardRef(function RegionFilter({ selectedRegions = [], onRegionsChange, onPickCoordinate, onDataLoaded }, ref) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [existingRegions, setExistingRegions] = useState([]);
  const [isPickingFromMap, setIsPickingFromMap] = useState(false);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Загружаем существующие регионы при открытии
  const loadExistingRegions = async () => {
    try {
      const response = await fetch(`${API_BASE}/regions/`);
      if (response.ok) {
        const regions = await response.json();
        setExistingRegions(regions);
        // Показываем все существующие регионы в меню, отсортированные по алфавиту
        const sortedRegions = regions
          .map(r => ({ ...r, isExisting: true }))
          .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
        setSuggestions(sortedRegions);
        setShowSuggestions(true);
        console.log(`Loaded ${regions.length} existing regions`);
      }
    } catch (error) {
      console.error('Error loading existing regions:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadExistingRegions();
    }
  }, [isOpen]);

  // Nominatim API для поиска городов
  const searchCities = async (query) => {
    if (!query || query.length < 2) {
      const sortedRegions = existingRegions
        .map(r => ({ ...r, isExisting: true }))
        .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
      setSuggestions(sortedRegions);
      return;
    }

    setLoading(true);
    try {
      // Сначала ищем в существующих регионах
      const existingMatches = existingRegions.filter(region =>
        region.name.toLowerCase().includes(query.toLowerCase())
      );

      // Ищем в Nominatim
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=10&accept-language=ru`,
        { headers: { 'Accept-Language': 'ru' } }
      );
      const data = await response.json();
      
      const filtered = data.filter(item => {
        const type = item.type || '';
        const className = item.class || '';
        return (
          (className === 'place' && (type === 'city' || type === 'town' || type === 'village' || type === 'hamlet')) ||
          className === 'boundary'
        );
      }).slice(0, 8);

      // Объединяем: сначала существующие, потом новые
      const combined = [
        ...existingMatches.map(r => ({ ...r, isExisting: true })),
        ...filtered
      ];

      // Удаляем дубликаты по названию
      const uniqueSuggestions = combined.reduce((acc, current) => {
        const displayName = current.isExisting 
          ? current.name 
          : (current.address?.city || current.address?.town || current.address?.village || current.name);
        
        const isDuplicate = acc.some(item => {
          const itemDisplayName = item.isExisting 
            ? item.name 
            : (item.address?.city || item.address?.town || item.address?.village || item.name);
          return itemDisplayName.toLowerCase() === displayName.toLowerCase();
        });

        if (!isDuplicate) {
          acc.push(current);
        }
        return acc;
      }, []);

      // Сортируем по алфавиту
      const sortedSuggestions = uniqueSuggestions.sort((a, b) => {
        const aName = a.isExisting 
          ? a.name 
          : (a.address?.city || a.address?.town || a.address?.village || a.name);
        const bName = b.isExisting 
          ? b.name 
          : (b.address?.city || b.address?.town || b.address?.village || b.name);
        return aName.localeCompare(bName, 'ru');
      });

      setSuggestions(sortedSuggestions);
    } catch (error) {
      console.error('Error searching cities:', error);
      const sortedRegions = existingRegions
        .map(r => ({ ...r, isExisting: true }))
        .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
      setSuggestions(sortedRegions);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput) {
        searchCities(searchInput);
        setShowSuggestions(true);
      } else {
        // При пустом поиске показываем все существующие регионы
        setSuggestions(existingRegions.map(r => ({ ...r, isExisting: true })));
        setShowSuggestions(true);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput, existingRegions]);

  // Функция для загрузки данных по выбранному городу
  const loadRegionData = async (displayName, lat, lon, osm_id) => {
    setLoadingData(true);
    try {
      // Сначала создаём или получаем регион в БД
      const regionData = {
        name: displayName,
        latitude: lat,
        longitude: lon,
        display_name: displayName,
        nominatim_id: osm_id,
      };

      let region;
      try {
        region = await createRegion(regionData);
      } catch (error) {
        console.error('Error creating region in DB:', error);
        region = null;
      }

      // Загружаем объекты по названию города
      const objects = await loadObjectsByCity(displayName);
      console.log(`Found ${objects.length} objects in ${displayName}`);

      // Загружаем кабели, где обе точки из этого города
      const cables = await loadCablesByCity(objects);
      console.log(`Found ${cables.length} cables in ${displayName}`);

      // Если регион создан успешно, добавляем найденные объекты в регион
      if (region && region.region_id && objects.length > 0) {
        try {
          for (const obj of objects) {
            const objId = obj.network_object_id || obj.id;
            await fetch(`http://localhost:8000/api/regions/${region.region_id}/objects/${objId}`, {
              method: 'POST'
            });
          }
          console.log(`Added ${objects.length} objects to region ${region.region_id}`);
        } catch (error) {
          console.error('Error adding objects to region:', error);
        }
      }

      // Если регион создан успешно, добавляем найденные кабели в регион
      if (region && region.region_id && cables.length > 0) {
        try {
          for (const cable of cables) {
            const cableId = cable.cable_id || cable.id;
            await fetch(`http://localhost:8000/api/regions/${region.region_id}/cables/${cableId}`, {
              method: 'POST'
            });
          }
          console.log(`Added ${cables.length} cables to region ${region.region_id}`);
        } catch (error) {
          console.error('Error adding cables to region:', error);
        }
      }

      // Отправляем данные в родительский компонент
      if (onDataLoaded) {
        onDataLoaded({
          region,
          objects,
          cables,
          cityName: displayName,
        });
      }

      // Добавляем регион в список выбранных
      const newRegion = {
        id: `${lat}_${lon}_${Date.now()}`,
        name: displayName,
        lat,
        lon,
        type: 'city',
        region_id: region?.region_id,
        objects_count: objects.length,
        cables_count: cables.length,
      };

      if (!selectedRegions.some(r => r.name === newRegion.name)) {
        const updatedRegions = [...selectedRegions, newRegion];
        onRegionsChange(updatedRegions);
      }
      
      // Перезагружаем список существующих регионов
      await loadExistingRegions();
    } catch (error) {
      console.error('Error loading region data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const addRegion = async (suggestion) => {
    let displayName, lat, lon, osm_id;

    if (suggestion.isExisting) {
      // Это существующий регион из БД
      displayName = suggestion.name;
      lat = suggestion.latitude;
      lon = suggestion.longitude;
      osm_id = suggestion.nominatim_id;
    } else {
      // Это новый город из Nominatim
      displayName = suggestion.address?.city || 
                   suggestion.address?.town || 
                   suggestion.address?.village || 
                   suggestion.name;
      lat = parseFloat(suggestion.lat);
      lon = parseFloat(suggestion.lon);
      osm_id = suggestion.osm_id;
    }
    
    // Проверяем, выбран ли уже этот регион
    const alreadySelected = selectedRegions.some(r => r.name === displayName);
    
    if (alreadySelected) {
      // Если уже выбран - удаляем
      removeRegion(selectedRegions.find(r => r.name === displayName).id);
    } else {
      // Если не выбран - добавляем
      await loadRegionData(displayName, lat, lon, osm_id);
    }

    setSearchInput('');
  };

  const removeRegion = (regionId) => {
    const updatedRegions = selectedRegions.filter(r => r.id !== regionId);
    onRegionsChange(updatedRegions);
  };

  // Обработка координат с карты - обратный геокодинг
  const handleMapCoordinate = async (lat, lon) => {
    setIsPickingFromMap(false);
    setLoadingData(true);
    try {
      // Используем Nominatim для обратного геокодинга
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1&accept-language=ru`,
        { headers: { 'Accept-Language': 'ru' } }
      );
      const data = await response.json();
      
      // Извлекаем название города
      const cityName = data.address?.city || 
                       data.address?.town || 
                       data.address?.village || 
                       data.address?.hamlet ||
                       data.name ||
                       'Unknown Location';
      
      console.log(`Found location: ${cityName} at ${lat}, ${lon}`);
      
      // Используем существующую функцию для загрузки региона
      await loadRegionData(cityName, lat, lon, data.osm_id);
    } catch (error) {
      console.error('Error reverse geocoding:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const refreshRegionData = async (region) => {
    // Обновляем данные региона без удаления и повторного добавления
    try {
      setLoadingData(true);
      const objects = await loadObjectsByCity(region.name);
      const cables = await loadCablesByCity(objects);
      
      // Обновляем счётчики
      const updatedRegions = selectedRegions.map(r => 
        r.id === region.id 
          ? { ...r, objects_count: objects.length, cables_count: cables.length }
          : r
      );
      onRegionsChange(updatedRegions);
      
      // Отправляем обновленные данные
      if (onDataLoaded) {
        onDataLoaded({
          region,
          objects,
          cables,
          cityName: region.name,
        });
      }
    } catch (error) {
      console.error('Error refreshing region data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  // Expose handleMapCoordinate function to parent component
  useImperativeHandle(ref, () => ({
    handleMapCoordinate: handleMapCoordinate
  }), [selectedRegions, existingRegions]);

  const handleClickOutside = (e) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
      setIsOpen(false);
      setShowSuggestions(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="region-filter-dropdown" ref={dropdownRef}>
      <button 
        className="region-filter-toggle"
        onClick={() => setIsOpen(!isOpen)}
        disabled={loadingData}
        title={selectedRegions.length > 0 ? selectedRegions.map(r => r.name).join(', ') : 'Нет выбранных регионов'}
      >
        <span className="region-icon">{loadingData ? '⏳' : ''}</span>
        <span className="region-label">
          {selectedRegions.length > 0 ? `${selectedRegions.length} ${selectedRegions.length === 1 ? 'регион' : 'регионов'}` : 'Регионы'}
        </span>
        <span className={`region-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </button>

      {isOpen && (
        <div className="region-filter-menu">
          <div className="region-search-container">
            <div className="region-search-wrapper">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Поиск города..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                className="region-search-input"
                disabled={loadingData}
              />
              {(loading || loadingData) && <span className="search-loading">⏳</span>}
            </div>

            <button
              className="pick-from-map-btn"
              onClick={() => {
                setIsPickingFromMap(true);
                if (onPickCoordinate) {
                  onPickCoordinate();
                }
              }}
              disabled={loadingData || isPickingFromMap}
              title="Нажмите на карту для определения города"
            >
              {isPickingFromMap ? '⏳ Ожидание клика на карте...' : 'На карте'}
            </button>
          </div>

          <div className="region-list-container">
            {showSuggestions && suggestions.length > 0 ? (
              <div className="region-suggestions full-list">
                {suggestions
                  .slice()
                  .sort((a, b) => {
                    const aDisplay = a.isExisting ? a.name : (a.address?.city || a.address?.town || a.address?.village || a.name);
                    const bDisplay = b.isExisting ? b.name : (b.address?.city || b.address?.town || b.address?.village || b.name);
                    const aSelected = selectedRegions.some(r => r.name === aDisplay);
                    const bSelected = selectedRegions.some(r => r.name === bDisplay);
                    
                    // Сначала выбранные, потом невыбранные
                    if (aSelected !== bSelected) {
                      return aSelected ? -1 : 1;
                    }
                    // В пределах одной группы - по алфавиту
                    return aDisplay.localeCompare(bDisplay, 'ru');
                  })
                  .map((suggestion, idx) => {
                  const isSelected = selectedRegions.some(r => r.name === suggestion.name || r.name === (suggestion.address?.city || suggestion.address?.town || suggestion.address?.village || suggestion.name));
                  const displayName = suggestion.isExisting 
                    ? suggestion.name 
                    : (suggestion.address?.city || suggestion.address?.town || suggestion.address?.village || suggestion.name);
                  
                  return (
                    <div
                      key={idx}
                      className={`region-suggestion-item ${isSelected ? 'selected' : ''} ${suggestion.isExisting ? 'existing' : ''}`}
                      onClick={() => addRegion(suggestion)}
                    >
                      <div className="region-item-content">
                        {suggestion.isExisting && <span className="existing-badge">✓</span>}
                        <span className="suggestion-name">{displayName}</span>
                        {isSelected && selectedRegions.find(r => r.name === suggestion.name) && (
                          <>
                            <span 
                              className="region-stats"
                              onClick={(e) => {
                                e.stopPropagation();
                                refreshRegionData(selectedRegions.find(r => r.name === suggestion.name));
                              }}
                              title="Клик для обновления"
                            >
                              {selectedRegions.find(r => r.name === suggestion.name)?.objects_count || 0} о. / {selectedRegions.find(r => r.name === suggestion.name)?.cables_count || 0} к.
                            </span>
                            <button
                              className="region-delete-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeRegion(selectedRegions.find(r => r.name === suggestion.name).id);
                              }}
                              title="Удалить"
                              disabled={loadingData}
                            >
                              ✕
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="region-empty-text">Нет регионов</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

export default RegionFilter;
