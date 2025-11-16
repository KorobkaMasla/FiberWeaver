import React, { useState, useRef, useEffect } from 'react';
import L from 'leaflet';
import './DrawingMode.css';

function DrawingMode({ mapRef, isActive, onClose, drawnItems, setDrawnItems }) {
  const [currentTool, setCurrentTool] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedShape, setSelectedShape] = useState(null);
  const [spacePressed, setSpacePressed] = useState(false);
  const drawingRef = useRef({
    startPoint: null,
    endPoint: null,
    shape: null,
    previewShape: null,
  });
  // Актуальный список фигур
  const drawnItemsRef = useRef(drawnItems);
  const spacePressedRef = useRef(false);
  const activeCleanupRef = useRef(null);

  useEffect(() => {
    if (!isActive) {
      finishTool({ enableDrag: true, resetTool: true });
    }
  }, [isActive]);

  useEffect(() => {
    return () => {
      finishTool({ enableDrag: true, resetTool: true });
      setCurrentTool(null);
    };
  }, []);

  useEffect(() => {
    drawnItemsRef.current = drawnItems;
  }, [drawnItems]);

  useEffect(() => {
    spacePressedRef.current = spacePressed;
  }, [spacePressed]);

  // Обработка зажима Space для панорамирования карты
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if (e.code === 'Space') {
        e.preventDefault();
        setSpacePressed(true);
        if (mapRef) {
          mapRef.dragging.enable();
        }
        // Прервать текущий набросок чтобы не рисовалось при панорамировании
        if (drawingRef.current.startPoint || drawingRef.current.previewShape) {
          if (drawingRef.current.previewShape && mapRef) {
            mapRef.removeLayer(drawingRef.current.previewShape);
          }
          drawingRef.current.startPoint = null;
          drawingRef.current.previewShape = null;
          setIsDrawing(false);
        }
      }
    };

    const handleKeyUp = (e) => {
      // Не перехватываем пробел если фокус на input/textarea (например при поиске)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if (e.code === 'Space') {
        e.preventDefault();
        setSpacePressed(false);
        if (mapRef && currentTool) {
          mapRef.dragging.disable();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [mapRef, currentTool]);

  const resetDrawing = () => {
    if (drawingRef.current.previewShape && mapRef) {
      mapRef.removeLayer(drawingRef.current.previewShape);
    }
    drawingRef.current = {
      startPoint: null,
      endPoint: null,
      shape: null,
      previewShape: null,
    };
  };

  // Рисование полигона: клики добавляют точки; Enter или клик возле первой точки замыкает
  const startPolygon = () => {
    if (!mapRef) return;
    finishTool({ enableDrag: false });
    setCurrentTool('polygon');
    mapRef.dragging.disable();
    const points = [];
    let polyline = null;
    const vertexMarkers = [];
    const CLOSE_PIXELS = 14; // допуск клика по первой точке

    const finalizePolygon = () => {
      if (points.length < 3) return;
      if (polyline) {
        mapRef.removeLayer(polyline);
        polyline = null;
      }
      const polygon = L.polygon(points, {
        color: '#4a9eff',
        fillColor: '#4a9eff',
        fillOpacity: 0.3,
        weight: 2,
      }).addTo(mapRef);
      setDrawnItems((prev) => [...prev, { type: 'polygon', layer: polygon, points: [...points] }]);
      // Очистить маркеры и подготовить новый набор точек
      vertexMarkers.forEach(m => mapRef.removeLayer(m));
      vertexMarkers.length = 0;
      points.length = 0;
    };

    const handleMapClick = (e) => {
      const { lat, lng } = e.latlng;
      // Проверка клика по первой точке для замыкания
      if (points.length >= 3) {
        const first = L.latLng(points[0][0], points[0][1]);
        const clickPt = e.latlng;
        const firstPixel = mapRef.latLngToContainerPoint(first);
        const clickPixel = mapRef.latLngToContainerPoint(clickPt);
        const dist = Math.hypot(firstPixel.x - clickPixel.x, firstPixel.y - clickPixel.y);
        if (dist <= CLOSE_PIXELS) {
          finalizePolygon();
          if (!spacePressed && mapRef.dragging.enabled()) mapRef.dragging.disable();
          return;
        }
      }

      points.push([lat, lng]);

      // Маркер-вершина для удобного клика
      const marker = L.circleMarker([lat, lng], {
        radius: 6,
        color: '#4a9eff',
        weight: 2,
        fillColor: '#4a9eff',
        fillOpacity: 0.9,
        pane: 'markerPane'
      }).addTo(mapRef);
      vertexMarkers.push(marker);

      if (polyline) {
        mapRef.removeLayer(polyline);
      }
      if (points.length >= 2) {
        polyline = L.polyline(points, {
          color: '#4a9eff',
          weight: 2,
          dashArray: '5, 5',
        }).addTo(mapRef);
      }
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
      finalizePolygon();
      if (!spacePressed && mapRef.dragging.enabled()) mapRef.dragging.disable();
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        finalizePolygon();
        if (!spacePressed && mapRef.dragging.enabled()) mapRef.dragging.disable();
      }
    };

    mapRef.on('click', handleMapClick);
    mapRef.on('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    activeCleanupRef.current = () => {
      mapRef.off('click', handleMapClick);
      mapRef.off('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
      if (polyline) mapRef.removeLayer(polyline);
      vertexMarkers.forEach(m => mapRef.removeLayer(m));
      resetDrawing();
    };
  };

  // Рисование линии через Drag & Drop
  const startLine = () => {
    if (!mapRef) return;
    finishTool({ enableDrag: false }); 
    setCurrentTool('line');
    mapRef.dragging.disable();

    const getTouchCoords = (touch) => {
      const containerPoint = L.point(touch.clientX, touch.clientY);
      const layerPoint = mapRef.containerPointToLayerPoint(containerPoint);
      return mapRef.layerPointToLatLng(layerPoint);
    };

    const handleMouseDown = (e) => {
      if (spacePressed) return;
      setIsDrawing(true);
      drawingRef.current.startPoint = mapRef.mouseEventToLatLng(e.originalEvent);
    };

    const handleTouchStart = (e) => {
      if (spacePressed || e.touches.length !== 1) return;
      e.preventDefault();
      setIsDrawing(true);
      drawingRef.current.startPoint = getTouchCoords(e.touches[0]);
    };

    const handleMouseMove = (e) => {
      if (!drawingRef.current.startPoint || spacePressed) return;

      const endPoint = mapRef.mouseEventToLatLng(e.originalEvent);

      if (drawingRef.current.previewShape) {
        mapRef.removeLayer(drawingRef.current.previewShape);
      }

      drawingRef.current.previewShape = L.polyline([drawingRef.current.startPoint, endPoint], {
        color: '#ff9d4a',
        weight: 3,
        dashArray: '5, 5',
      }).addTo(mapRef);
    };

    const handleTouchMove = (e) => {
      if (!drawingRef.current.startPoint || spacePressed || e.touches.length !== 1) return;
      e.preventDefault();

      const endPoint = getTouchCoords(e.touches[0]);

      if (drawingRef.current.previewShape) {
        mapRef.removeLayer(drawingRef.current.previewShape);
      }

      drawingRef.current.previewShape = L.polyline([drawingRef.current.startPoint, endPoint], {
        color: '#ff9d4a',
        weight: 3,
        dashArray: '5, 5',
      }).addTo(mapRef);
    };

    const handleMouseUp = () => {
      if (drawingRef.current.startPoint && drawingRef.current.previewShape) {
        const points = [...drawingRef.current.previewShape.getLatLngs()];
        const line = L.polyline(points, {
          color: '#ff9d4a',
          weight: 3,
        }).addTo(mapRef);
        setDrawnItems((prev) => [...prev, { type: 'line', layer: line, points }]);
      }
      // Сброс только текущего штриха инструмент остаётся активным
      if (drawingRef.current.previewShape && mapRef) {
        mapRef.removeLayer(drawingRef.current.previewShape);
      }
      drawingRef.current.startPoint = null;
      drawingRef.current.previewShape = null;
      setIsDrawing(false);
      if (!spacePressed && mapRef.dragging.enabled()) {
        mapRef.dragging.disable();
      }
    };

    mapRef.on('mousedown', handleMouseDown);
    mapRef.on('mousemove', handleMouseMove);
    mapRef.on('touchstart', handleTouchStart);
    mapRef.on('touchmove', handleTouchMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleMouseUp);

    activeCleanupRef.current = () => {
      mapRef.off('mousedown', handleMouseDown);
      mapRef.off('mousemove', handleMouseMove);
      mapRef.off('touchstart', handleTouchStart);
      mapRef.off('touchmove', handleTouchMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleMouseUp);
      resetDrawing();
    };
  };

  // Рисование прямоугольника через Drag & Drop
  const startRectangle = () => {
    if (!mapRef) return;
    finishTool({ enableDrag: false }); 
    setCurrentTool('rectangle');
    mapRef.dragging.disable();

    const getTouchCoords = (touch) => {
      const containerPoint = L.point(touch.clientX, touch.clientY);
      const layerPoint = mapRef.containerPointToLayerPoint(containerPoint);
      return mapRef.layerPointToLatLng(layerPoint);
    };

    const handleMouseDown = (e) => {
      if (spacePressed) return;
      setIsDrawing(true);
      drawingRef.current.startPoint = mapRef.mouseEventToLatLng(e.originalEvent);
    };

    const handleTouchStart = (e) => {
      if (spacePressed || e.touches.length !== 1) return;
      e.preventDefault();
      setIsDrawing(true);
      drawingRef.current.startPoint = getTouchCoords(e.touches[0]);
    };

    const handleMouseMove = (e) => {
      if (!drawingRef.current.startPoint || spacePressed) return;

      const endPoint = mapRef.mouseEventToLatLng(e.originalEvent);
      const bounds = L.latLngBounds([drawingRef.current.startPoint, endPoint]);

      if (drawingRef.current.previewShape) {
        mapRef.removeLayer(drawingRef.current.previewShape);
      }

      drawingRef.current.previewShape = L.rectangle(bounds, {
        color: '#9d4aff',
        fillColor: '#9d4aff',
        fillOpacity: 0.2,
        weight: 2,
        dashArray: '5, 5',
      }).addTo(mapRef);
    };

    const handleTouchMove = (e) => {
      if (!drawingRef.current.startPoint || spacePressed || e.touches.length !== 1) return;
      e.preventDefault();

      const endPoint = getTouchCoords(e.touches[0]);
      const bounds = L.latLngBounds([drawingRef.current.startPoint, endPoint]);

      if (drawingRef.current.previewShape) {
        mapRef.removeLayer(drawingRef.current.previewShape);
      }

      drawingRef.current.previewShape = L.rectangle(bounds, {
        color: '#9d4aff',
        fillColor: '#9d4aff',
        fillOpacity: 0.2,
        weight: 2,
        dashArray: '5, 5',
      }).addTo(mapRef);
    };

    const handleMouseUp = () => {
      if (drawingRef.current.previewShape) {
        const bounds = drawingRef.current.previewShape.getBounds();
        const rectangle = L.rectangle(bounds, {
          color: '#9d4aff',
          fillColor: '#9d4aff',
          fillOpacity: 0.3,
          weight: 2,
        }).addTo(mapRef);
        setDrawnItems((prev) => [...prev, { type: 'rectangle', layer: rectangle, bounds }]);
      }
      if (drawingRef.current.previewShape && mapRef) {
        mapRef.removeLayer(drawingRef.current.previewShape);
      }
      drawingRef.current.startPoint = null;
      drawingRef.current.previewShape = null;
      setIsDrawing(false);
      if (!spacePressed && mapRef.dragging.enabled()) {
        mapRef.dragging.disable();
      }
    };

    mapRef.on('mousedown', handleMouseDown);
    mapRef.on('mousemove', handleMouseMove);
    mapRef.on('touchstart', handleTouchStart);
    mapRef.on('touchmove', handleTouchMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleMouseUp);

    activeCleanupRef.current = () => {
      mapRef.off('mousedown', handleMouseDown);
      mapRef.off('mousemove', handleMouseMove);
      mapRef.off('touchstart', handleTouchStart);
      mapRef.off('touchmove', handleTouchMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleMouseUp);
      resetDrawing();
    };
  };

  // Рисование круга через Drag & Drop
  const startCircle = () => {
    if (!mapRef) return;
    finishTool({ enableDrag: false }); 
    setCurrentTool('circle');
    mapRef.dragging.disable();

    const getTouchCoords = (touch) => {
      const containerPoint = L.point(touch.clientX, touch.clientY);
      const layerPoint = mapRef.containerPointToLayerPoint(containerPoint);
      return mapRef.layerPointToLatLng(layerPoint);
    };

    const handleMouseDown = (e) => {
      if (spacePressed) return;
      setIsDrawing(true);
      drawingRef.current.startPoint = mapRef.mouseEventToLatLng(e.originalEvent);
    };

    const handleTouchStart = (e) => {
      if (spacePressed || e.touches.length !== 1) return;
      e.preventDefault();
      setIsDrawing(true);
      drawingRef.current.startPoint = getTouchCoords(e.touches[0]);
    };

    const handleMouseMove = (e) => {
      if (!drawingRef.current.startPoint || spacePressed) return;

      const endPoint = mapRef.mouseEventToLatLng(e.originalEvent);
      const radius = Math.sqrt(
        Math.pow(drawingRef.current.startPoint.lat - endPoint.lat, 2) +
        Math.pow(drawingRef.current.startPoint.lng - endPoint.lng, 2)
      ) * 111000;

      if (drawingRef.current.previewShape) {
        mapRef.removeLayer(drawingRef.current.previewShape);
      }

      drawingRef.current.previewShape = L.circle(drawingRef.current.startPoint, {
        radius: Math.max(radius, 10),
        color: '#4aff9d',
        fillColor: '#4aff9d',
        fillOpacity: 0.2,
        weight: 2,
        dashArray: '5, 5',
      }).addTo(mapRef);
    };

    const handleTouchMove = (e) => {
      if (!drawingRef.current.startPoint || spacePressed || e.touches.length !== 1) return;
      e.preventDefault();

      const endPoint = getTouchCoords(e.touches[0]);
      const radius = Math.sqrt(
        Math.pow(drawingRef.current.startPoint.lat - endPoint.lat, 2) +
        Math.pow(drawingRef.current.startPoint.lng - endPoint.lng, 2)
      ) * 111000;

      if (drawingRef.current.previewShape) {
        mapRef.removeLayer(drawingRef.current.previewShape);
      }

      drawingRef.current.previewShape = L.circle(drawingRef.current.startPoint, {
        radius: Math.max(radius, 10),
        color: '#4aff9d',
        fillColor: '#4aff9d',
        fillOpacity: 0.2,
        weight: 2,
        dashArray: '5, 5',
      }).addTo(mapRef);
    };

    const handleMouseUp = () => {
      if (drawingRef.current.previewShape) {
        const center = drawingRef.current.previewShape.getLatLng();
        const radius = drawingRef.current.previewShape.getRadius();
        const circle = L.circle(center, {
          radius,
          color: '#4aff9d',
          fillColor: '#4aff9d',
          fillOpacity: 0.3,
          weight: 2,
        }).addTo(mapRef);
        setDrawnItems((prev) => [...prev, { type: 'circle', layer: circle, center, radius }]);
      }
      if (drawingRef.current.previewShape && mapRef) {
        mapRef.removeLayer(drawingRef.current.previewShape);
      }
      drawingRef.current.startPoint = null;
      drawingRef.current.previewShape = null;
      setIsDrawing(false);
      if (!spacePressed && mapRef.dragging.enabled()) {
        mapRef.dragging.disable();
      }
    };

    mapRef.on('mousedown', handleMouseDown);
    mapRef.on('mousemove', handleMouseMove);
    mapRef.on('touchstart', handleTouchStart);
    mapRef.on('touchmove', handleTouchMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleMouseUp);

    activeCleanupRef.current = () => {
      mapRef.off('mousedown', handleMouseDown);
      mapRef.off('mousemove', handleMouseMove);
      mapRef.off('touchstart', handleTouchStart);
      mapRef.off('touchmove', handleTouchMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleMouseUp);
      resetDrawing();
    };
  };

  // Свободное рисование (карандаш) через Drag
  const startFreehand = () => {
    if (!mapRef) return;
    finishTool({ enableDrag: false }); 
    setCurrentTool('freehand');
    mapRef.dragging.disable();
    const points = [];

    const getTouchCoords = (touch) => {
      const containerPoint = L.point(touch.clientX, touch.clientY);
      const layerPoint = mapRef.containerPointToLayerPoint(containerPoint);
      return mapRef.layerPointToLatLng(layerPoint);
    };

    const handleMouseDown = (e) => {
      if (spacePressed) return;
      points.length = 0;
      setIsDrawing(true);
      drawingRef.current.startPoint = true;
    };

    const handleTouchStart = (e) => {
      if (spacePressed || e.touches.length !== 1) return;
      e.preventDefault();
      points.length = 0;
      setIsDrawing(true);
      drawingRef.current.startPoint = true;
    };

    const handleMouseMove = (e) => {
      if (!drawingRef.current.startPoint || spacePressed) return;

      const point = mapRef.mouseEventToLatLng(e.originalEvent);
      points.push(point);

      if (points.length > 1) {
        if (!drawingRef.current.previewShape) {
          drawingRef.current.previewShape = L.polyline(points, {
            color: '#ff4a7d',
            weight: 2,
          }).addTo(mapRef);
        } else {
          drawingRef.current.previewShape.setLatLngs(points);
        }
      }
    };

    const handleTouchMove = (e) => {
      if (!drawingRef.current.startPoint || spacePressed || e.touches.length !== 1) return;
      e.preventDefault();

      const point = getTouchCoords(e.touches[0]);
      points.push(point);

      if (points.length > 1) {
        if (!drawingRef.current.previewShape) {
          drawingRef.current.previewShape = L.polyline(points, {
            color: '#ff4a7d',
            weight: 2,
          }).addTo(mapRef);
        } else {
          drawingRef.current.previewShape.setLatLngs(points);
        }
      }
    };

    const handleMouseUp = () => {
      if (drawingRef.current.previewShape && points.length > 1) {
        const polyline = L.polyline(points, {
          color: '#ff4a7d',
          weight: 2,
        }).addTo(mapRef);
        setDrawnItems((prev) => [...prev, { type: 'freehand', layer: polyline, points: [...points] }]);
      }
      if (drawingRef.current.previewShape && mapRef) {
        mapRef.removeLayer(drawingRef.current.previewShape);
      }
      drawingRef.current.startPoint = null;
      drawingRef.current.previewShape = null;
      setIsDrawing(false);
      if (!spacePressed && mapRef.dragging.enabled()) {
        mapRef.dragging.disable();
      }
    };

    mapRef.on('mousedown', handleMouseDown);
    mapRef.on('mousemove', handleMouseMove);
    mapRef.on('touchstart', handleTouchStart);
    mapRef.on('touchmove', handleTouchMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleMouseUp);

    activeCleanupRef.current = () => {
      mapRef.off('mousedown', handleMouseDown);
      mapRef.off('mousemove', handleMouseMove);
      mapRef.off('touchstart', handleTouchStart);
      mapRef.off('touchmove', handleTouchMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleMouseUp);
      resetDrawing();
    };
  };

  const finishTool = (opts = {}) => {
    const { enableDrag = false, resetTool = false } = opts;
    if (activeCleanupRef.current) {
      try { activeCleanupRef.current(); } catch (err) { console.warn('Ошибка очистки инструмента:', err); }
      activeCleanupRef.current = null;
    } else {
      resetDrawing();
    }
    setIsDrawing(false);
    if (resetTool) setCurrentTool(null);
    if (mapRef) {
      if (enableDrag) mapRef.dragging.enable(); else mapRef.dragging.disable();
    }
  };

  useEffect(() => {
    if (!isActive || !mapRef) return;
    if (currentTool && currentTool !== 'hand' && !spacePressed) {
      if (mapRef.dragging.enabled()) mapRef.dragging.disable();
    }
    if ((currentTool === 'hand' || spacePressed) && isActive) {
      if (!mapRef.dragging.enabled()) mapRef.dragging.enable();
    }
  }, [currentTool, spacePressed, isDrawing, isActive, mapRef]);

  const startHand = () => {
    if (!mapRef) return;
    if (currentTool && currentTool !== 'hand') {
      finishTool({ enableDrag: true });
    }
    activeCleanupRef.current = null; 
    setIsDrawing(false);
    setCurrentTool('hand');
    mapRef.dragging.enable();
  };

  // Удалить выбранную фигуру
  const deleteSelected = () => {
    if (selectedShape !== null) {
      drawnItems[selectedShape].layer.removeFrom(mapRef);
      setDrawnItems(drawnItems.filter((_, i) => i !== selectedShape));
      setSelectedShape(null);
    }
  };

  // Инструмент Ластик 
  const startEraser = () => {
    if (!mapRef) return;
    finishTool({ enableDrag: false });
    setCurrentTool('eraser');
    mapRef.dragging.disable();

    const handleMapClick = (e) => {
      const spaceHeld = spacePressedRef.current;

      if (spaceHeld) {
        return;
      }

      if (!e.latlng) {
        if (!spaceHeld && mapRef.dragging.enabled()) {
          mapRef.dragging.disable();
        }
        return;
      }

      const items = drawnItemsRef.current;
      if (!items.length) {
        if (!spaceHeld && mapRef.dragging.enabled()) {
          mapRef.dragging.disable();
        }
        return;
      }

      for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        if (!item.layer || !item.layer.getBounds) continue;
        const bounds = item.layer.getBounds();
        if (bounds && bounds.contains && bounds.contains(e.latlng)) {
          item.layer.removeFrom(mapRef);
          setDrawnItems((prev) => prev.filter((_, idx) => idx !== i));
          break;
        }
      }

      if (!spaceHeld && mapRef.dragging.enabled()) {
        mapRef.dragging.disable();
      }
    };

    mapRef.on('click', handleMapClick);

    activeCleanupRef.current = () => {
      mapRef.off('click', handleMapClick);
      resetDrawing();
    };
  };

  // Очистить всё
  const clearAll = () => {
    drawnItems.forEach((item) => {
      if (item.layer) item.layer.removeFrom(mapRef);
    });
    setDrawnItems([]);
    resetDrawing();
    setSelectedShape(null);
  };

  if (!isActive) return null;

  return (
    <div className="drawing-vertical-toolbar">
      <div className="toolbar-group tools">
        <button
          className={`tool-icon ${currentTool === 'hand' || spacePressed ? 'active' : ''}`}
          onClick={startHand}
          title="Рука (перемещение)"
        >
          🖐️
        </button>
        <button
          className={`tool-icon ${currentTool === 'line' ? 'active' : ''}`}
          onClick={startLine}
          title="Линия"
        >
          📏
        </button>
        <button
          className={`tool-icon ${currentTool === 'rectangle' ? 'active' : ''}`}
          onClick={startRectangle}
          title="Прямоугольник"
        >
          ◻️
        </button>
        <button
          className={`tool-icon ${currentTool === 'circle' ? 'active' : ''}`}
          onClick={startCircle}
          title="Круг"
        >
          ⭕
        </button>
        <button
          className={`tool-icon ${currentTool === 'freehand' ? 'active' : ''}`}
          onClick={startFreehand}
          title="Карандаш"
        >
          ✏️
        </button>
        <button
          className={`tool-icon ${currentTool === 'polygon' ? 'active' : ''}`}
          onClick={startPolygon}
          title="Полигон"
        >
          🔷
        </button>
        <button
          className={`tool-icon ${currentTool === 'eraser' ? 'active' : ''}`}
          onClick={startEraser}
          title="Ластик (удалить)"
        >
          🧹
        </button>
      </div>
      <div className="toolbar-group actions">
        <button
          className="tool-icon danger"
          onClick={deleteSelected}
          disabled={selectedShape === null}
          title="Удалить выбранную"
        >
          🗑️
        </button>
        <button
          className="tool-icon"
          onClick={clearAll}
          title="Очистить всё"
        >
          ♻️
        </button>
        <button
          className="tool-icon close"
          onClick={onClose}
          title="Закрыть режим"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export default DrawingMode;
