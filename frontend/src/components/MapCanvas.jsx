import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMapEvents } from 'react-leaflet';
import { createMarkerIcon, getCableColor, calculateDistance } from './mapEditorUtils';

// Помощник событий карты
function MapEvents({ measureMode, addingPoint, pickingCoordinates, drawCableMode, onMapClick, onMapMouseMove }) {
  useMapEvents({
    mousedown(e) {
      if (e.originalEvent.button === 2) return;
      if (addingPoint || pickingCoordinates || drawCableMode) {
        this.dragging.disable();
      }
    },
    mousemove(e) {
      if (drawCableMode) onMapMouseMove(e.latlng);
    },
    mouseup() {
      if (!addingPoint && !pickingCoordinates && !drawCableMode) {
        this.dragging.enable();
      }
    },
    click(e) {
      if (drawCableMode) return; 
      if (measureMode || pickingCoordinates || addingPoint) {
        onMapClick(e.latlng);
      }
    }
  });
  return null;
}

function MapCanvas(props) {
  const {
    mapPosition,
    mapRefSetter,
    tileLayer,
    getTileLayerUrl,
    getTileLayerAttribution,
    objects,
    cables,
    cableForm,
    drawCableMode,
    cableStartObject,
    drawingCableEndPoint,
    highlightedDependentObjects,
    markerRefsMap,
    cableStartObjectRef,
    setCableForm,
    setActiveTab,
    setDrawCableMode,
    setCableStartObject,
    setDrawingCableEndPoint,
    showToolsNotification,
    handleShowDependentObjects,
    handleEditCable,
    handleDeleteCable,
    handleEditObject,
    handleDeleteObject,
    objectTypeEmojis,
    objectTypeNames,
    measureMode,
    addingPoint,
    pickingCoordinates,
    measurePoints,
    handleMapClick,
    handleMapMouseMove,
    visibleObjectTypes = new Set(Object.keys(objectTypeEmojis || {})),
    visibleCableTypes = new Set(['optical', 'copper'])
  } = props;

  const visibleObjects = objects.filter(obj => visibleObjectTypes.has(obj.object_type));
  
  const visibleCables = cables.filter(cable => visibleCableTypes.has(cable.cable_type));

  return (
    <MapContainer
      center={mapPosition}
      zoom={13}
      scrollWheelZoom={true}
      className="leaflet-map"
      style={{ height: '100%', width: '100%' }}
      ref={mapRefSetter}
    >
      <MapEvents
        measureMode={measureMode}
        addingPoint={addingPoint}
        pickingCoordinates={pickingCoordinates}
        drawCableMode={drawCableMode}
        onMapClick={handleMapClick}
        onMapMouseMove={handleMapMouseMove}
      />
      <TileLayer url={getTileLayerUrl()} attribution={getTileLayerAttribution()} />

      {visibleCables.map(cable => {
        const fromObj = objects.find(o => o.id === cable.from_object_id);
        const toObj = objects.find(o => o.id === cable.to_object_id);
        if (!fromObj || !toObj) return null;
        return (
          <Polyline
            key={`cable-${cable.id}-${cable.cable_type_id}`}
            positions={[[fromObj.latitude, fromObj.longitude], [toObj.latitude, toObj.longitude]]}
            color={cable.cable_type_color || '#3b82f6'}
            weight={3}
            opacity={0.8}
            dashArray={cable.cable_type === 'optical' ? '' : '5, 5'}
          >
            <Popup>
              <div className="cable-popup">
                <p><strong>{cable.name}</strong></p>
                <p>{cable.cable_type === 'optical' ? 'Оптический' : 'Медный'}</p>
                {cable.fiber_count && <p>Волокон: {cable.fiber_count}</p>}
                {cable.distance_km && <p>Расстояние: {cable.distance_km} км</p>}
                <div className="popup-actions" style={{ marginTop: '8px', display: 'flex', gap: '6px', flexDirection: 'column' }}>
                  <button
                    onClick={() => handleShowDependentObjects(cable)}
                    className="btn-icon"
                    title="Показать подключённые объекты"
                    style={{ width: '100%', padding: '6px', fontSize: '12px', backgroundColor: '#3b82f6', color: 'white' }}
                  >
                    🔍 Зависимые
                  </button>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => { handleEditCable(cable); setActiveTab('cables'); }}
                      className="btn-icon"
                      title="Редактировать"
                      style={{ flex: 1, padding: '4px 6px', fontSize: '12px' }}
                    >
                      ✏️ Редакт
                    </button>
                    <button
                      onClick={() => handleDeleteCable(cable.id)}
                      className="btn-icon"
                      title="Удалить"
                      style={{ flex: 1, padding: '4px 6px', fontSize: '12px' }}
                    >
                      🗑️ Удалить
                    </button>
                  </div>
                </div>
              </div>
            </Popup>
          </Polyline>
        );
      })}

      {drawCableMode && cableStartObject && drawingCableEndPoint && (() => {
        const startObj = objects.find(o => o.id === cableStartObject);
        if (!startObj) return null;
        return (
          <Polyline
            positions={[[startObj.latitude, startObj.longitude], [drawingCableEndPoint.lat, drawingCableEndPoint.lng]]}
            pathOptions={{ color: '#3b82f6', weight: 3, opacity: 0.7, dashArray: '5, 5' }}
            interactive={false}
            className="cable-drawing-temp"
          />
        );
      })()}

      {highlightedDependentObjects.map(objId => {
        const obj = objects.find(o => o.id === objId);
        if (!obj) return null;
        const currentZoom = props.mapRef?.getZoom() || 13;
        const baseRadius = Math.pow(2, 16 - currentZoom) * 50;
        const radius = Math.max(50, Math.min(baseRadius, 500));
        const weight = Math.max(2, 5 - Math.floor(currentZoom / 5));
        const opacity = Math.min(0.9, 0.7 + (20 - currentZoom) * 0.02);
        const fillOpacity = Math.min(0.6, 0.3 + (20 - currentZoom) * 0.02);
        return (
          <Circle
            key={`highlight-${objId}`}
            center={[obj.latitude, obj.longitude]}
            radius={radius}
            pathOptions={{ color: '#fbbf24', fillColor: '#fbbf24', weight, opacity, fillOpacity, dashArray: '5, 5' }}
          />
        );
      })}

      {visibleObjects.map(obj => (
        <Marker
          key={obj.id}
          position={[obj.latitude, obj.longitude]}
          icon={createMarkerIcon(objectTypeEmojis[obj.object_type] || '')}
          ref={(ref) => {
            if (ref && ref.leafletElement) {
              markerRefsMap.current[obj.id] = ref.leafletElement;
            } else if (ref) {
              markerRefsMap.current[obj.id] = ref;
            }
          }}
          eventHandlers={{
            mousedown: (e) => {
              if (!drawCableMode) return;
              if (e.originalEvent.button !== 0) return;
              e.originalEvent.stopPropagation();
              if (!cableStartObjectRef.current) {
                cableStartObjectRef.current = obj.id;
                setCableStartObject(obj.id);
                showToolsNotification(`Начало: ${obj.name}`);
              } else if (cableStartObjectRef.current !== obj.id) {
                const startObjId = cableStartObjectRef.current;
                setCableForm(prev => ({ ...prev, from_object_id: startObjId, to_object_id: obj.id }));
                setActiveTab('cables');
                showToolsNotification('✓ Выберите тип кабеля и заполните остальные данные');
                setDrawCableMode(false);
                cableStartObjectRef.current = null;
                setCableStartObject(null);
                setDrawingCableEndPoint(null);
              } else {
                cableStartObjectRef.current = null;
                setCableStartObject(null);
                setDrawingCableEndPoint(null);
                showToolsNotification('Сброс начальной метки');
              }
            },
            click: (e) => {
              if (!drawCableMode) return;
              e.originalEvent.stopPropagation();
              if (!cableStartObjectRef.current) {
                cableStartObjectRef.current = obj.id;
                setCableStartObject(obj.id);
                showToolsNotification(`Начало: ${obj.name}`);
              } else if (cableStartObjectRef.current !== obj.id) {
                const startObjId = cableStartObjectRef.current;
                setCableForm(prev => ({ ...prev, from_object_id: startObjId, to_object_id: obj.id }));
                setActiveTab('cables');
                showToolsNotification('✓ Выберите тип кабеля и заполните остальные данные');
                setDrawCableMode(false);
                cableStartObjectRef.current = null;
                setCableStartObject(null);
                setDrawingCableEndPoint(null);
              }
            },
            mouseover: (e) => {
              if (drawCableMode && cableStartObjectRef.current && cableStartObjectRef.current !== obj.id) {
                if (!e.target._icon.classList.contains('selected')) {
                  e.target._icon.classList.add('selected');
                }
              }
            },
            mouseout: (e) => {
              e.target._icon.classList.remove('selected');
            }
          }}
        >
          <Popup>
            <div className="popup-content">
              <p><strong>{obj.display_name || obj.name}</strong></p>
              <p>{obj.display_name || objectTypeNames[obj.object_type]}</p>
              <small>{obj.latitude.toFixed(4)}, {obj.longitude.toFixed(4)}</small>
              <div className="popup-actions" style={{ marginTop: '8px', display: 'flex', gap: '6px' }}>
                <button onClick={() => { handleEditObject(obj); setActiveTab('objects'); }} className="btn-icon" title="Редактировать" style={{ flex: 1, padding: '4px 6px', fontSize: '12px' }}>✏️ Редакт</button>
                <button onClick={() => { handleDeleteObject(obj.id); }} className="btn-icon" title="Удалить" style={{ flex: 1, padding: '4px 6px', fontSize: '12px' }}>🗑️ Удалить</button>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}

      {measurePoints.map((point, idx) => {
        let segmentDistance = null;
        if (idx > 0) segmentDistance = calculateDistance(measurePoints[idx - 1], point);
        let cumulativeDistance = 0;
        for (let i = 1; i <= idx; i++) cumulativeDistance += calculateDistance(measurePoints[i - 1], measurePoints[i]);
        return (
          <React.Fragment key={`measure-${idx}`}>
            <Circle center={point} radius={20} pathOptions={{ color: '#ff6b6b', fillColor: '#ff6b6b', weight: 2 }} />
            <Popup position={point} closeButton={false} autoClose={false} closeOnClick={false}>
              <div style={{ textAlign: 'center', minWidth: '100px' }}>
                <strong>Точка {idx + 1}</strong><br />
                {segmentDistance !== null && <>Сегмент: {segmentDistance.toFixed(2)} км<br /></>}
                Итого: {cumulativeDistance.toFixed(2)} км
              </div>
            </Popup>
          </React.Fragment>
        );
      })}

      {measurePoints.length > 1 && (
        <Polyline positions={measurePoints} pathOptions={{ color: '#ff6b6b', dashArray: '5, 5', weight: 2 }} />
      )}

    </MapContainer>
  );
}

export default MapCanvas;