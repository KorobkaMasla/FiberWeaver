import React, { useState } from 'react';

function SearchFilterMenu({
  type, // 'objects' or 'cables'
  objectTypes = [],
  objectTypeEmojis,
  objectTypeNames,
  cableTypes = [],
  selectedFilters,
  onFilterChange
}) {
  const [showMenu, setShowMenu] = useState(false);

  const isObjects = type === 'objects';
  
  // Для объектов - используем данные из БД если доступны, иначе hardcoded
  const objectFilterOptions = objectTypes.length > 0
    ? objectTypes.map(objType => ({
        value: objType.name,
        label: `${objType.emoji || ''} ${objType.display_name || objType.name}`,
        emoji: objType.emoji || ''
      }))
    : Object.entries(objectTypeEmojis || {}).map(([key, emoji]) => ({
        value: key,
        label: `${emoji} ${objectTypeNames[key] || key}`,
        emoji
      }));

  // Для кабелей - используем данные из БД
  const cableFilterOptions = cableTypes.length > 0
    ? cableTypes.map(cableType => ({
        value: cableType.name,
        label: cableType.name,
        color: cableType.color || '#666666'
      }))
    : [];

  const filterOptions = isObjects ? objectFilterOptions : cableFilterOptions;

  const toggleFilter = (filterValue) => {
    const newFilters = new Set(selectedFilters);
    if (newFilters.has(filterValue)) {
      newFilters.delete(filterValue);
    } else {
      newFilters.add(filterValue);
    }
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    onFilterChange(new Set());
  };

  return (
    <div className="search-filter-menu">
      <button
        className="filter-menu-btn"
        onClick={() => setShowMenu(!showMenu)}
        title="Быстрые фильтры"
      >
        ⚙️
        {selectedFilters.size > 0 && (
          <span className="filter-badge">{selectedFilters.size}</span>
        )}
      </button>

      {showMenu && (
        <div className="filter-menu-dropdown">
          <div className="filter-menu-header">
            <span className="filter-menu-title">
              {isObjects ? 'Типы объектов' : 'Типы кабелей'}
            </span>
            {selectedFilters.size > 0 && (
              <button
                onClick={clearFilters}
                className="clear-filters-btn"
                title="Очистить фильтры"
              >
                ✕
              </button>
            )}
          </div>

          <div className="filter-menu-options">
            {filterOptions.length > 0 ? (
              filterOptions.map(option => (
                <label key={option.value} className="filter-menu-item">
                  <input
                    type="checkbox"
                    checked={selectedFilters.has(option.value)}
                    onChange={() => toggleFilter(option.value)}
                  />
                  {isObjects ? (
                    <span>{option.label}</span>
                  ) : (
                    <span>
                      <span
                        className="filter-color-dot"
                        style={{ backgroundColor: option.color }}
                      />
                      {option.label}
                    </span>
                  )}
                </label>
              ))
            ) : (
              <div style={{ padding: '8px', color: '#999' }}>
                {isObjects ? 'Загрузка типов объектов...' : 'Загрузка типов кабелей...'}
              </div>
            )}
          </div>

          {selectedFilters.size > 0 && (
            <div className="filter-menu-footer">
              <small>Выбрано: {selectedFilters.size}</small>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SearchFilterMenu;
