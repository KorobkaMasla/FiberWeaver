import React from 'react';
import ToolsNotification from './ToolsNotification';
import FilterPanel from './FilterPanel';

function MapToolsBar({
  measureMode,
  drawCableMode,
  drawingMode,
  measurePoints,
  highlightedDependentObjects,
  onMeasureToggle,
  onDrawCableToggle,
  onDrawingToggle,
  onClearMeasurements,
  onClearDependentHighlight,
  tileLayer,
  setTileLayer,
  objectTypes = [],
  visibleObjectTypes,
  toggleObjectTypeVisibility,
  cableTypes = [],
  visibleCableTypes,
  toggleCableTypeVisibility
}) {
  const handleLayerChange = (value) => setTileLayer(value);

  return (
    <div className="map-tools-panel" title="M: измерить | K: кабель | C: очистить | Esc: отмена">
      <div className="tools-group">
        <button
          onClick={onMeasureToggle}
          className={`tool-btn ${measureMode ? 'active' : ''}`}
          title="Измерить расстояние"
        >
          📏
        </button>
        <button
          onClick={onDrawCableToggle}
          className={`tool-btn ${drawCableMode ? 'active' : ''}`}
          title="Рисовать кабель"
        >
          🔗
        </button>
        <button
          onClick={onDrawingToggle}
          className={`tool-btn ${drawingMode ? 'active' : ''}`}
          title="Режим рисования"
        >
          🎨
        </button>
      </div>
      <div className="tools-group overflow-controls">
        {measureMode && measurePoints.length > 0 && (
          <button onClick={onClearMeasurements} className="tool-btn secondary" title="Очистить измерения">♻️</button>
        )}
        {highlightedDependentObjects.length > 0 && (
          <button onClick={onClearDependentHighlight} className="tool-btn secondary" title="Очистить подсветку">🔇</button>
        )}
      </div>
      <div className="tools-group layer-select-group">
        <select
          value={tileLayer}
          onChange={(e) => handleLayerChange(e.target.value)}
          className="layer-select"
          title="Смена подложки карты"
        >
          <option value="osm">🗺️ OSM</option>
          <option value="satellite">🛰️ Космос</option>
          <option value="terrain">⛰️ Тер</option>
        </select>
      </div>
      <FilterPanel
        objectTypes={objectTypes}
        visibleObjectTypes={visibleObjectTypes}
        toggleObjectTypeVisibility={toggleObjectTypeVisibility}
        cableTypes={cableTypes}
        visibleCableTypes={visibleCableTypes}
        toggleCableTypeVisibility={toggleCableTypeVisibility}
      />
    </div>
  );
}

export default MapToolsBar;