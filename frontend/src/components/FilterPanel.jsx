import React, { useState } from 'react';
import { objectTypeEmojis, objectTypeNames } from './mapEditorUtils';

function FilterPanel({
  objectTypes = [],
  visibleObjectTypes,
  toggleObjectTypeVisibility,
  cableTypes = [],
  visibleCableTypes,
  toggleCableTypeVisibility
}) {
  const [showFilters, setShowFilters] = useState(false);

  // Если объекты типов не загружены из БД, используем hardcoded
  const displayObjectTypes = objectTypes.length > 0 
    ? objectTypes 
    : Object.keys(objectTypeEmojis).map(name => ({ name, emoji: objectTypeEmojis[name], display_name: objectTypeNames[name] }));

  return (
    <div className="filter-panel">
      <button
        className="filter-toggle-btn"
        onClick={() => setShowFilters(!showFilters)}
        title="Показать/скрыть фильтры"
      >
        🔍
      </button>

      {showFilters && (
        <div className="filter-dropdown">
          <div className="filter-section">
            <div className="filter-section-title">Типы объектов</div>
            <div className="filter-options">
              {displayObjectTypes.map(type => (
                <label key={type.name} className="filter-checkbox">
                  <input
                    type="checkbox"
                    checked={visibleObjectTypes.has(type.name)}
                    onChange={() => toggleObjectTypeVisibility(type.name)}
                  />
                  <span>{type.emoji || ''} {type.display_name || type.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <div className="filter-section-title">Типы кабелей</div>
            <div className="filter-options">
              {cableTypes.length > 0 ? (
                cableTypes.map(type => (
                  <label key={type.name} className="filter-checkbox">
                    <input
                      type="checkbox"
                      checked={visibleCableTypes.has(type.name)}
                      onChange={() => toggleCableTypeVisibility(type.name)}
                    />
                    <span>
                      <span
                        className="cable-type-color"
                        style={{ backgroundColor: type.color || '#666666' }}
                      />
                      {type.name}
                    </span>
                  </label>
                ))
              ) : (
                <div style={{ padding: '8px', color: '#999' }}>Загрузка типов кабелей...</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FilterPanel;
