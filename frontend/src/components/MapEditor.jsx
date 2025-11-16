import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Toast from './Toast';
import ToolsNotification from './ToolsNotification';
import authService from '../services/authService';
import './MapEditor.css';
import { reverseGeocode, createMarkerIcon, objectTypeEmojis, objectTypeNames, cableTypeColors, getCableColor } from './mapEditorUtils';
import MapEditorSidebar from './MapEditorSidebar';
import MapToolsBar from './MapToolsBar';
import MapSearch from './MapSearch';
import DrawingMode from './DrawingMode';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const OBJECT_TYPES = [
  'Узел',
  'Муфта',
  'Шкаф',
  'Сплиттер',
  'Абонент',
  'Столб',
  'Колодец',
  'Камера',
  'Wi-Fi'
];

const CABLE_TYPES = [
  'optical',
  'copper'
];

function MapEvents({ measureMode, selectMode, addingPoint, pickingCoordinates, drawCableMode, pickingRegionCoordinate, onMapClick, onSelectMode, onMapMouseMove, onRegionCoordinatePicked }) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const map = useMapEvents({
    mousedown(e) {
      // Правый клик не отключает перетаскивание
      if (e.originalEvent.button === 2) {
        return;
      }
      
      if (addingPoint || pickingCoordinates || drawCableMode) {
        // Отключаем перетаскивание карты при добавлении точки выборе координат или рисовании кабеля
        map.dragging.disable();
        return;
      }
      if (selectMode && !measureMode) {
        setIsDrawing(true);
        setStartPoint(e.latlng);
      }
    },
    mousemove(e) {
      if (isDrawing && startPoint) {
        onSelectMode(startPoint, e.latlng);
      }
      if (drawCableMode) {
        onMapMouseMove(e.latlng);
      }
    },
    mouseup() {
      if (isDrawing) {
        setIsDrawing(false);
      }
      // Включаем перетаскивание карты
      map.dragging.enable();
    },
    click(e) {
      if (pickingRegionCoordinate && onRegionCoordinatePicked) {
        onRegionCoordinatePicked(e.latlng.lat, e.latlng.lng);
      } else if (addingPoint || pickingCoordinates) {
        onMapClick(e);
      } else if (measureMode && !selectMode) {
        onMapClick(e);
      }
    },
    contextmenu(e) {
      // Отключаем контекстное меню при рисовании кабеля
      if (drawCableMode) {
        e.originalEvent.preventDefault();
      }
    }
  });
  return null;
}

function MapEditor({ objects, onObjectsChange, sidebarVisible, setSidebarVisible, selectedRegions = [], pickingRegionCoordinate = false, onRegionCoordinatePicked }) {
  const [mapPosition, setMapPosition] = useState([55.7558, 37.6173]);
  const [activeTab, setActiveTab] = useState('objects');
  const [cables, setCables] = useState([]);
  const [formHeight, setFormHeight] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  
  const markerRefsMap = useRef({});
  const cableStartObjectRef = useRef(null);
  const highlightedMarkerRef = useRef(null);
  
  const [highlightedDependentObjects, setHighlightedDependentObjects] = useState([]);
    const [objectForm, setObjectForm] = useState({
      name: '',
      object_type_id: 1,  
      latitude: 55.7558,
      longitude: 37.6173,
      address: ''
    });

  const [cableForm, setCableForm] = useState({
    name: '',
    cable_type: 'optical',
    from_object_id: '',
    to_object_id: '',
    fiber_count: '',
    distance_km: ''
  });

  const [loading, setLoading] = useState(false);
  const [cableLoading, setCableLoading] = useState(false);
  const [editingObjectId, setEditingObjectId] = useState(null);
  const [editingCableId, setEditingCableId] = useState(null);
  const [toast, setToast] = useState(null);
  const [tileLayer, setTileLayer] = useState('osm'); 
  const [measureMode, setMeasureMode] = useState(false);
  const [measurePoints, setMeasurePoints] = useState([]);
  const [selectMode, setSelectMode] = useState(false);
  const [selectionBounds, setSelectionBounds] = useState(null);
  const [toolsNotification, setToolsNotification] = useState(null);
  const [toolsNotificationKey, setToolsNotificationKey] = useState(0);
  const [visibleObjectTypes, setVisibleObjectTypes] = useState(new Set(Object.keys(objectTypeEmojis)));
  const [visibleCableTypes, setVisibleCableTypes] = useState(new Set()); 
  const [objectTypeEmojiMap, setObjectTypeEmojiMap] = useState(objectTypeEmojis);
  const [objectTypeNameMap, setObjectTypeNameMap] = useState(objectTypeNames);
  const [objectsSearchTerm, setObjectsSearchTerm] = useState('');
  const [cablesSearchTerm, setCablesSearchTerm] = useState('');
  const [objectsQuickFilters, setObjectsQuickFilters] = useState(new Set());
  const [filteredObjects, setFilteredObjects] = useState([]);
  const [filteredCables, setFilteredCables] = useState([]);
  const [cablesQuickFilters, setCablesQuickFilters] = useState(new Set());
  const [addressLoading, setAddressLoading] = useState(false);
  const [searchActive, setSearchActive] = useState(false);
  const [mapRef, setMapRef] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1025);
  const [pickingCoordinates, setPickingCoordinates] = useState(false);
  const [addingPoint, setAddingPoint] = useState(false);
  const [draggedCableId, setDraggedCableId] = useState(null);
  const [dragTargetObjectId, setDragTargetObjectId] = useState(null);
  const [drawCableMode, setDrawCableMode] = useState(false);
  const [cableStartObject, setCableStartObject] = useState(null);
  const [drawingCableEndPoint, setDrawingCableEndPoint] = useState(null);
  const [cableTypes, setCableTypes] = useState([]);
  const [objectTypes, setObjectTypes] = useState([]); 
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null
  });
  const [drawingMode, setDrawingMode] = useState(false);
  const [drawnShapes, setDrawnShapes] = useState([]);
  
  const showToolsNotification = (message) => {
    setToolsNotification(message);
    setToolsNotificationKey(prev => prev + 1);
  };

  useEffect(() => {
    const filterByRegions = async () => {
      if (selectedRegions && selectedRegions.length > 0) {
        const regionObjectIds = new Set();
        
        for (const region of selectedRegions) {
          try {
            const response = await fetch(`http://localhost:8000/api/regions/${region.region_id}`);
            if (response.ok) {
              const regionData = await response.json();
              if (regionData.network_objects && Array.isArray(regionData.network_objects)) {
                regionData.network_objects.forEach(obj => {
                  regionObjectIds.add(obj.network_object_id || obj.id);
                });
              }
            }
          } catch (error) {
            console.error(`Error fetching region ${region.region_id}:`, error);
          }
        }
        
        console.log(`Region object IDs: ${Array.from(regionObjectIds).join(', ')}`);
        
        if (regionObjectIds.size > 0) {
          const filtered = objects.filter(obj => regionObjectIds.has(obj.network_object_id || obj.id));
          console.log(`Filtered objects: ${filtered.length} out of ${objects.length}`);
          setFilteredObjects(filtered);

          const filtered_cables = cables.filter(cable => 
            regionObjectIds.has(cable.from_object_id) && regionObjectIds.has(cable.to_object_id)
          );
          console.log(`Filtered cables: ${filtered_cables.length} out of ${cables.length}`);
          setFilteredCables(filtered_cables);
        } else {
          console.log('No objects found in selected regions');
          setFilteredObjects([]);
          setFilteredCables([]);
        }
      } else {
        console.log('No regions selected - showing all objects and cables');
        setFilteredObjects(objects);
        setFilteredCables(cables);
      }
    };
    
    filterByRegions();
  }, [selectedRegions, objects, cables]);

  useEffect(() => {
    fetchCables();
    fetchCableTypes();
    fetchObjectTypes();

    const handleRefresh = () => {
      fetchCables();
      onObjectsChange(); 
    };

    window.addEventListener('storage', (e) => {
      if (e.key === 'refresh_data') {
        handleRefresh();
      }
    });

    return () => {
      window.removeEventListener('storage', handleRefresh);
    };
  }, [onObjectsChange]);

  const fetchCableTypes = async () => {
    try {
      const response = await authService.authenticatedFetch('http://localhost:8000/api/reference/cable-types');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const raw = await response.json();
      const normalized = raw.map(t => ({
        cable_type_id: t.cable_type_id,
        name: t.name,  
        fiber_count: t.fiber_count ?? 0,
        color: t.color || '#666666'
      }));
      setCableTypes(normalized);
      setVisibleCableTypes(new Set(normalized.map(t => t.name)));
    } catch (err) {
      console.error('Error fetching cable types:', err);
      const fallback = [
        { cable_type_id: 1, name: 'ОКГ-1', fiber_count: 1, color: '#0000FF' },
        { cable_type_id: 2, name: 'ОКГ-2', fiber_count: 2, color: '#FFA500' },
        { cable_type_id: 3, name: 'ОКГ-4', fiber_count: 4, color: '#A52A2A' },
        { cable_type_id: 4, name: 'ОКГ-8', fiber_count: 8, color: '#800080' },
        { cable_type_id: 5, name: 'ОКГ-12', fiber_count: 12, color: '#000000' },
        { cable_type_id: 6, name: 'ОКГ-24', fiber_count: 24, color: '#FFFFFF' },
        { cable_type_id: 7, name: 'ОКГ-48', fiber_count: 48, color: '#FF0000' },
        { cable_type_id: 8, name: 'ОКГ-96', fiber_count: 96, color: '#008000' }
      ];
      setCableTypes(fallback);
      setVisibleCableTypes(new Set(fallback.map(t => t.name)));
    }
  };

  const fetchObjectTypes = async () => {
    try {
      const response = await authService.authenticatedFetch('http://localhost:8000/api/reference/object-types');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setObjectTypes(data);
    } catch (err) {
      console.error('Error fetching object types:', err);
      setObjectTypes([]);
    }
  };

  useEffect(() => {
    if (objectTypes.length > 0) {
      const newEmojiMap = {};
      const newNameMap = {};
      objectTypes.forEach(type => {
        newEmojiMap[type.name] = type.emoji || '';
        newNameMap[type.name] = type.display_name;
      });
      setObjectTypeEmojiMap(newEmojiMap);
      setObjectTypeNameMap(newNameMap);
      setVisibleObjectTypes(new Set(objectTypes.map(t => t.name)));
    }
  }, [objectTypes]);

  const getObjectTypeEmoji = (objectType) => {
    return objectTypeEmojiMap[objectType] || '';
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Клавиша M: переключение режима измерения 
      if (e.code === 'KeyM') {
        e.preventDefault();
        setMeasureMode(prev => {
          const newMode = !prev;
          if (newMode) {
            setSelectMode(false);
            setToolsNotification('Режим рисования включён');
            setToolsNotificationKey(k => k + 1);
          }
          return newMode;
        });
      }
      // Клавиша C: очистка измерений/выборов.
      if (e.code === 'KeyC') {
        e.preventDefault();
        setMeasurePoints([]);
        setSelectionBounds(null);
      }
      // Клавиша P: переключить режим добавления точек.
      if (e.code === 'KeyP') {
        e.preventDefault();
        setAddingPoint(prev => {
          const newMode = !prev;
          if (newMode) {
            setMeasureMode(false);
            setSelectMode(false);
            setDrawCableMode(false);
            showToolsNotification('Нажмите на карте для добавления точки');
          }
          return newMode;
        });
      }
      // Клавиша K: переключить режим рисования кабеля.
      if (e.code === 'KeyK') {
        e.preventDefault();
        handleDrawCableModeToggle();
      }
      // Клавиша Esc: отменить текущий режим.
      if (e.code === 'Escape') {
        e.preventDefault();
        if (drawCableMode) {
          setDrawCableMode(false);
          cableStartObjectRef.current = null;
          setCableStartObject(null);
          setDrawingCableEndPoint(null);
          showToolsNotification('✕ Режим рисования отменён');
        }
        if (addingPoint) {
          setAddingPoint(false);
        }
        if (pickingCoordinates) {
          setPickingCoordinates(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Очистка конечной точки при наведении курсора мыши если она не находится над маркером.
  useEffect(() => {
    if (!drawCableMode) return;

    const handleGlobalMouseDown = (e) => {
      // Щелчок правой кнопкой мыши — отменить текущий чертеж кабеля (сбросить начальную точку).
      if (e.button === 2) {
        e.preventDefault();
        if (cableStartObjectRef.current) {
          cableStartObjectRef.current = null;
          setCableStartObject(null);
          setDrawingCableEndPoint(null);
          showToolsNotification('Кабель отменён, выберите новую начальную метку');
        }
        return;
      }
    };

    const handleGlobalMouseUp = (e) => {
      if (cableStartObjectRef.current && e.target && e.target.closest('.leaflet-marker-icon')) {
        return;
      }
      if (cableStartObjectRef.current) {
        setDrawingCableEndPoint(null);
      }
    };

    const handleContextMenu = (e) => {
      if (drawCableMode) {
        e.preventDefault();
      }
    };

    document.addEventListener('mousedown', handleGlobalMouseDown);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('contextmenu', handleContextMenu);
    return () => {
      document.removeEventListener('mousedown', handleGlobalMouseDown);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [drawCableMode]);

  // Обработка изменения размера окна для обнаружения мобильных устройств.
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const isMobileNow = width < 1025;
      setIsMobile(isMobileNow);
      if (isMobileNow) {
        setSidebarVisible(false);
      } else {
        setSidebarVisible(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setSidebarVisible]);

  const fetchCables = async () => {
    try {
      const response = await authService.authenticatedFetch('http://localhost:8000/api/cables/');
      const data = await response.json();
      setCables([...data]);
    } catch (error) {
      console.error('Error fetching cables:', error);
    }
  };

  const handleMeasureClick = () => {
    if (measureMode) {
      setMeasureMode(false);
    } else {
      setMeasureMode(true);
      setSelectMode(false);
      showToolsNotification('Measurement mode enabled');
    }
  };

  const handleMapClick = (e) => {
    if (addingPoint) {
      const lat = parseFloat(e.latlng.lat.toFixed(6));
      const lng = parseFloat(e.latlng.lng.toFixed(6));
      setObjectForm({
        name: '',
        object_type_id: 1,
        latitude: lat,
        longitude: lng,
        address: ''
      });
      setAddingPoint(false);
      setActiveTab('objects');
      showToolsNotification('Получаю адрес...');
      setAddressLoading(true);
      reverseGeocode(lat, lng)
        .then(addr => {
          setObjectForm(prev => ({ ...prev, address: addr }));
          showToolsNotification('✓ Адрес подставлен');
        })
        .catch(() => {
          showToolsNotification('⚠️ Адрес не найден');
        })
        .finally(() => setAddressLoading(false));
      return;
    }

    if (pickingCoordinates) {
      const lat = parseFloat(e.latlng.lat.toFixed(6));
      const lng = parseFloat(e.latlng.lng.toFixed(6));
      setObjectForm(prev => ({
        ...prev,
        latitude: lat,
        longitude: lng
      }));
      setPickingCoordinates(false);
      showToolsNotification('Получаю адрес...');
      setAddressLoading(true);
      reverseGeocode(lat, lng)
        .then(addr => {
          setObjectForm(prev => ({ ...prev, address: addr || prev.address }));
          showToolsNotification('✓ Координаты и адрес обновлены');
        })
        .catch(() => {
          showToolsNotification('⚠️ Адрес не найден');
        })
        .finally(() => setAddressLoading(false));
      return;
    }

    if (measureMode) {
      const newPoint = [e.latlng.lat, e.latlng.lng];
      const newPoints = [...measurePoints, newPoint];
      setMeasurePoints(newPoints);
    }
  };

  const calculateDistance = (point1, point2) => {
    const R = 6371; // Радиус Земли в км
    const lat1 = (point1[0] * Math.PI) / 180;
    const lat2 = (point2[0] * Math.PI) / 180;
    const dLat = ((point2[0] - point1[0]) * Math.PI) / 180;
    const dLon = ((point2[1] - point1[1]) * Math.PI) / 180;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleSelectMode = () => {
    if (selectMode) {
      setSelectMode(false);
      setMeasureMode(false);
    } else {
      setSelectMode(true);
      setMeasureMode(false);
      setMeasurePoints([]);
      showToolsNotification('Selection mode enabled');
    }
  };

  const getTileLayerUrl = () => {
    switch (tileLayer) {
      case 'satellite':
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      case 'terrain':
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}';
      default:
        return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    }
  };

  const getTileLayerAttribution = () => {
    switch (tileLayer) {
      case 'satellite':
      case 'terrain':
        return '&copy; Esri';
      default:
        return '&copy; OpenStreetMap contributors';
    }
  };

  const handleSelectionMode = (startPoint, endPoint) => {
    const minLat = Math.min(startPoint.lat, endPoint.lat);
    const maxLat = Math.max(startPoint.lat, endPoint.lat);
    const minLng = Math.min(startPoint.lng, endPoint.lng);
    const maxLng = Math.max(startPoint.lng, endPoint.lng);

    setSelectionBounds({
      north: maxLat,
      south: minLat,
      east: maxLng,
      west: minLng,
      corner1: [startPoint.lat, startPoint.lng],
      corner2: [endPoint.lat, endPoint.lng]
    });
  };

  const toggleObjectTypeVisibility = (type) => {
    setVisibleObjectTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type); else next.add(type);
      return next;
    });
  };

  const toggleCableTypeVisibility = (type) => {
    setVisibleCableTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type); else next.add(type);
      return next;
    });
  };

  const handleLocationSelect = ({ lat, lon }) => {
    if (mapRef) {
      mapRef.setView([parseFloat(lat), parseFloat(lon)], 15);
    }
    setObjectForm(prev => ({
      ...prev,
      latitude: parseFloat(lat),
      longitude: parseFloat(lon)
    }));
    showToolsNotification('Место выбрано из поиска');
  };

  const getObjectsInBounds = () => {
    if (!selectionBounds) return [];
    return objects.filter(obj => 
      obj.latitude >= selectionBounds.south &&
      obj.latitude <= selectionBounds.north &&
      obj.longitude >= selectionBounds.west &&
      obj.longitude <= selectionBounds.east
    );
  };

  const handleObjectInputChange = (e) => {
    const { name, value } = e.target;
    setObjectForm(prev => ({
      ...prev,
      [name]: name === 'latitude' || name === 'longitude' ? parseFloat(value) : value
    }));
  };

  const handleCableInputChange = (e) => {
    const { name, value } = e.target;
    let parsedValue = value;
    
    if (name === 'from_object_id' || name === 'to_object_id') {
      parsedValue = value ? parseInt(value, 10) : '';
    } else if (name === 'fiber_count') {
      if (value && value.trim()) {
        const num = parseInt(value, 10);
        parsedValue = isNaN(num) ? '' : num;
      } else {
        parsedValue = '';
      }
    } else if (name === 'distance_km') {
      parsedValue = value ? parseFloat(value) : '';
    }
    
    const updatedForm = {
      ...cableForm,
      [name]: parsedValue
    };
    
    if (name === 'cable_type' && value === 'copper') {
      updatedForm.fiber_count = '';
    }
    
    if ((name === 'from_object_id' || name === 'to_object_id') && updatedForm.from_object_id && updatedForm.to_object_id) {
      const fromObj = objects.find(o => o.id === updatedForm.from_object_id);
      const toObj = objects.find(o => o.id === updatedForm.to_object_id);
      if (fromObj && toObj) {
        const dist = calculateDistance(
          [fromObj.latitude, fromObj.longitude],
          [toObj.latitude, toObj.longitude]
        );
        updatedForm.distance_km = parseFloat(dist.toFixed(3));
      }
    }
    
    setCableForm(updatedForm);
  };

  const handleAddObject = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const trimmedName = (objectForm.name || '').trim();
      if (!trimmedName) {
        setToast({ message: 'Имя объекта не может быть пустым', type: 'error' });
        setLoading(false);
        return;
      }
      const payload = { ...objectForm, name: trimmedName };
      const response = await authService.authenticatedFetch('http://localhost:8000/api/network-objects/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        setToast({ message: 'Объект создан', type: 'success' });
        setObjectForm({
          name: '',
          object_type_id: 1,
          latitude: mapPosition[0],
          longitude: mapPosition[1],
          address: ''
        });
        onObjectsChange();
      } else {
        const errData = await response.json().catch(()=>({}));
        setToast({ message: `Ошибка: ${errData.detail || 'Не удалось создать'}`, type: 'error' });
      }
    } catch (error) {
      console.error('Error adding object:', error);
      setToast({ message: 'Ошибка создания объекта', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddCable = async (e) => {
    e.preventDefault();
    if (!cableForm.from_object_id || !cableForm.to_object_id) {
      setToast({ message: 'Выберите оба объекта', type: 'error' });
      return;
    }
    
    setCableLoading(true);
    try {
      let fiberCount = null;
      if (cableForm.cable_type === 'optical' && cableForm.fiber_count) {
        const num = parseInt(cableForm.fiber_count, 10);
        fiberCount = isNaN(num) ? null : num;
      }
      
      const response = await authService.authenticatedFetch('http://localhost:8000/api/cables/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cableForm.name,
          cable_type: cableForm.cable_type,
          from_object_id: cableForm.from_object_id,
          to_object_id: cableForm.to_object_id,
          fiber_count: fiberCount,
          distance_km: cableForm.distance_km || null
        })
      });
      if (response.ok) {
        setToast({ message: 'Кабель создан', type: 'success' });
        setCableForm({
          name: '',
          cable_type: 'optical',
          from_object_id: '',
          to_object_id: '',
          fiber_count: '',
          distance_km: ''
        });
        fetchCables();
      }
    } catch (error) {
      console.error('Error adding cable:', error);
      setToast({ message: 'Ошибка создания кабеля', type: 'error' });
    } finally {
      setCableLoading(false);
    }
  };

  const handleMergeCables = (cableId, targetObjectId) => {
    const cable = cables.find(c => c.id === cableId);
    if (!cable) return;

    setConfirmDialog({
      isOpen: true,
      title: `Присоединить кабель "${cable.name}" к объекту?`,
      onConfirm: async () => {
        try {
          const updatedCable = {
            ...cable,
            to_object_id: cable.to_object_id === targetObjectId ? cable.from_object_id : targetObjectId
          };
          
          const response = await authService.authenticatedFetch(
            `http://localhost:8000/api/cables/${cableId}/`,
            {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updatedCable)
            }
          );
          
          if (response.ok) {
            setToast({ message: 'Кабель присоединён', type: 'success' });
            fetchCables();
          }
        } catch (error) {
          console.error('Error merging cables:', error);
          setToast({ message: 'Ошибка присоединения кабеля', type: 'error' });
        }
      }
    });
  };

  const handleStartDrawCable = (objectId) => {
    if (!drawCableMode) return;
    
    if (!cableStartObjectRef.current) {
      // Первый клик - запомнили начальный объект
      cableStartObjectRef.current = objectId;
      setCableStartObject(objectId);
      showToolsNotification(`Начало: ${objects.find(o => o.id === objectId)?.name}`);
    } else if (cableStartObjectRef.current !== objectId) {
      // Второй клик на другом объекте - создаём кабель
      const startObjId = cableStartObjectRef.current;
      setCableForm(prev => ({
        ...prev,
        from_object_id: startObjId,
        to_object_id: objectId
      }));
      setActiveTab('cables');
      showToolsNotification('✓ Выберите тип кабеля и заполните остальные данные');
      setDrawCableMode(false);
      cableStartObjectRef.current = null;
      setCableStartObject(null);
      setDrawingCableEndPoint(null);
    }
  };

  const handleDrawCableModeToggle = () => {
    if (drawCableMode) {
      setDrawCableMode(false);
      cableStartObjectRef.current = null;
      setCableStartObject(null);
      setDrawingCableEndPoint(null);
    } else {
      setDrawCableMode(true);
      setMeasureMode(false);
      setSelectMode(false);
      setDrawingMode(false); 
      setMeasurePoints([]);
      setSelectionBounds(null);
      showToolsNotification('🔗 ЛКМ: метка 1 → метка 2 | ПКМ: отмена');
    }
  };

  const handleDrawingModeToggle = () => {
    setDrawingMode(prev => {
      const next = !prev;
      if (next) {
        setMeasureMode(false);
        setSelectMode(false);
        setDrawCableMode(false);
        cableStartObjectRef.current = null;
        setCableStartObject(null);
        setDrawingCableEndPoint(null);
        showToolsNotification('🎨 Режим рисования включен');
      } else {

        if (mapRef) {
          try { mapRef.dragging.enable(); } catch(e) {}
        }
      }
      return next;
    });
  };

  const handleMapMouseMove = (latlng) => {
    if (drawCableMode && cableStartObjectRef.current) {
      setDrawingCableEndPoint(latlng);
    }
  };

  const handleDeleteObject = (objectId) => {
    console.log('Deleting object with ID:', objectId, 'Type:', typeof objectId);
    if (!objectId || objectId === 'undefined') {
      setToast({ message: 'Ошибка: ID объекта не определён', type: 'error' });
      return;
    }
    const relatedCables = cables.filter(c => c.from_object_id === objectId || c.to_object_id === objectId);
    const message = relatedCables.length > 0 
      ? `Этот объект имеет ${relatedCables.length} подключенный кабель(и). Удалить объект и все подключённые кабели?`
      : 'Удалить этот объект?';
    
    setConfirmDialog({
      isOpen: true,
      title: '🗑️ Подтверждение удаления',
      message,
      onConfirm: async () => {
        try {
          for (const cable of relatedCables) {
            await authService.authenticatedFetch(`http://localhost:8000/api/cables/${cable.id}`, {
              method: 'DELETE'
            });
          }
          await authService.authenticatedFetch(`http://localhost:8000/api/network-objects/${objectId}`, {
            method: 'DELETE'
          });
          setToast({ message: 'Объект удален', type: 'success' });
          setEditingObjectId(null);
          setObjectForm({
            name: '',
            object_type_id: 1,
            latitude: 55.7558,
            longitude: 37.6173
          });
          fetchCables();
          onObjectsChange();
        } catch (error) {
          console.error('Error deleting object:', error);
          setToast({ message: 'Ошибка удаления объекта', type: 'error' });
        } finally {
          setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null, onCancel: null });
        }
      },
      onCancel: () => {
        setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null, onCancel: null });
      }
    });
  };

  const handleDeleteCable = (cableId) => {
    setConfirmDialog({
      isOpen: true,
      title: '🗑️ Подтверждение удаления',
      message: 'Удалить этот кабель?',
      onConfirm: async () => {
        try {
          const response = await authService.authenticatedFetch(`http://localhost:8000/api/cables/${cableId}`, {
            method: 'DELETE'
          });
          if (response.ok) {
            setToast({ message: 'Кабель удалён', type: 'success' });
            setEditingCableId(null);
            setCableForm({
              name: '',
              cable_type: 'optical',
              from_object_id: '',
              to_object_id: '',
              fiber_count: 12,
              distance_km: ''
            });
            fetchCables();
          } else {
            const error = await response.json();
            setToast({ message: `Ошибка: ${error.detail || 'Не удалось удалить кабель'}`, type: 'error' });
          }
        } catch (error) {
          console.error('Error deleting cable:', error);
          setToast({ message: 'Ошибка удаления кабеля', type: 'error' });
        } finally {
          setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null, onCancel: null });
        }
      },
      onCancel: () => {
        setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null, onCancel: null });
      }
    });
  };

  const handleEditObject = (obj) => {
    console.log('handleEditObject called with:', obj, 'ID:', obj.id, 'Type:', typeof obj.id);
    setActiveTab('objects');
    setEditingObjectId(obj.id);
    setSelectMode(false);
    setAddingPoint(false);
    setObjectForm({
      name: obj.name,
      object_type_id: obj.object_type_id,
      latitude: obj.latitude,
      longitude: obj.longitude,
      address: obj.address || ''
    });
  };

  const handleEditCable = (cable) => {
    setEditingCableId(cable.id);
    setSelectMode(false);
    setAddingPoint(false);
    setActiveTab('cables');
    
    let cable_type = 'copper';
    if (cable.fiber_count && cable.fiber_count > 0) {
      cable_type = 'optical';
    }
    
    setCableForm({
      name: cable.name,
      cable_type: cable_type,
      from_object_id: cable.from_object_id,
      to_object_id: cable.to_object_id,
      fiber_count: cable.fiber_count ? parseInt(cable.fiber_count, 10) : '',
      distance_km: cable.distance_km || ''
    });
  };

  const handleUpdateObject = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authService.authenticatedFetch(`http://localhost:8000/api/network-objects/${editingObjectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(objectForm)
      });
      setToast({ message: 'Объект обновлён', type: 'success' });
      setEditingObjectId(null);
      setObjectForm({
        name: '',
        object_type_id: 1,
        latitude: mapPosition[0],
        longitude: mapPosition[1],
        address: ''
      });
      onObjectsChange();
    } catch (error) {
      console.error('Error updating object:', error);
      setToast({ message: 'Ошибка обновления объекта', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCable = async (e) => {
    e.preventDefault();
    setCableLoading(true);
    try {
      let fiberCount = null;
      if (cableForm.cable_type === 'optical' && cableForm.fiber_count) {
        const num = parseInt(cableForm.fiber_count, 10);
        fiberCount = isNaN(num) ? null : num;
      }
      
      await authService.authenticatedFetch(`http://localhost:8000/api/cables/${editingCableId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cableForm.name,
          cable_type: cableForm.cable_type,
          from_object_id: cableForm.from_object_id,
          to_object_id: cableForm.to_object_id,
          fiber_count: fiberCount,
          distance_km: cableForm.distance_km || null
        })
      });
      setToast({ message: 'Кабель обновлён', type: 'success' });
      setEditingCableId(null);
      setCableForm({
        name: '',
        cable_type: 'optical',
        from_object_id: '',
        to_object_id: '',
        fiber_count: '',
        distance_km: ''
      });
      await fetchCables();
    } catch (error) {
      console.error('Error updating cable:', error);
      setToast({ message: 'Ошибка обновления кабеля', type: 'error' });
    } finally {
      setCableLoading(false);
    }
  };

  const getDependentObjects = (cable) => {
    const allDependentIds = new Set();
    const visited = new Set();
    
    const queue = [cable.from_object_id, cable.to_object_id];
    
    while (queue.length > 0) {
      const currentObjectId = queue.shift();
      
      if (visited.has(currentObjectId)) continue;
      visited.add(currentObjectId);
      allDependentIds.add(currentObjectId);
      
      cables.forEach(c => {
        let otherEnd = null;
        
        if (c.from_object_id === currentObjectId) {
          otherEnd = c.to_object_id;
        } else if (c.to_object_id === currentObjectId) {
          otherEnd = c.from_object_id;
        }
        
        if (otherEnd !== null && !visited.has(otherEnd)) {
          queue.push(otherEnd);
        }
      });
    }
    
    console.log('All dependent objects (BFS):', Array.from(allDependentIds));
    return Array.from(allDependentIds);
  };

  const handleShowDependentObjects = (cable) => {
    const dependentIds = getDependentObjects(cable);
    console.log('Cable:', cable.id, 'from:', cable.from_object_id, 'to:', cable.to_object_id);
    console.log('Dependent objects:', dependentIds);
    console.log('All cables:', cables);
    setHighlightedDependentObjects(dependentIds);
    showToolsNotification(`🔍 ${dependentIds.length} объектов подсвечены`);
  };

  const handleClearDependentHighlight = () => {
    setHighlightedDependentObjects([]);
    showToolsNotification('Подсвечивание отменено');
  };

  // Триггер повторного рендеринга при изменении зума карты
  useEffect(() => {
    if (!mapRef || highlightedDependentObjects.length === 0) return;

    const handleZoomChange = () => {
      // Принудительный повторный рендеринг путем создания новой ссылки
      setHighlightedDependentObjects(prev => [...prev]);
    };

    mapRef.on('zoom', handleZoomChange);
    return () => {
      mapRef.off('zoom', handleZoomChange);
    };
  }, [mapRef, highlightedDependentObjects.length]);

  // Автоматический расчет расстояния кабеля при изменении объектов начала/конца
  useEffect(() => {
    if (cableForm.from_object_id && cableForm.to_object_id) {
      const fromObj = objects.find(o => o.id === cableForm.from_object_id);
      const toObj = objects.find(o => o.id === cableForm.to_object_id);
      
      if (fromObj && toObj) {
        const distance = parseFloat(calculateDistance(
          [fromObj.latitude, fromObj.longitude],
          [toObj.latitude, toObj.longitude]
        ).toFixed(3));
        
        if (cableForm.distance_km !== distance) {
          setCableForm(prev => ({
            ...prev,
            distance_km: distance
          }));
        }
      }
    }
  }, [cableForm.from_object_id, cableForm.to_object_id, objects]);

  return (
    <div className="map-editor">
      <div 
        className="map-container"
        onContextMenu={(e) => selectMode && e.preventDefault()}
      >
        <MapContainer 
          center={mapPosition} 
          zoom={13} 
          scrollWheelZoom={true}
          className={`leaflet-map ${pickingRegionCoordinate ? 'picking-region' : ''}`}
          style={{ height: '100%', width: '100%' }}
          ref={setMapRef}
        >
          <MapEvents 
            measureMode={measureMode} 
            selectMode={selectMode}
            addingPoint={addingPoint}
            pickingCoordinates={pickingCoordinates}
            drawCableMode={drawCableMode}
            pickingRegionCoordinate={pickingRegionCoordinate}
            onMapClick={handleMapClick}
            onSelectMode={handleSelectionMode}
            onMapMouseMove={handleMapMouseMove}
            onRegionCoordinatePicked={onRegionCoordinatePicked}
          />
          <TileLayer
            url={getTileLayerUrl()}
            attribution={getTileLayerAttribution()}
          />
          
          
          {/* Кабели в виде линий */}
          {filteredCables.filter(cable => {
            if (!visibleCableTypes.has(cable.cable_type_name)) return false;
            const fromObj = filteredObjects.find(o => o.id === cable.from_object_id);
            const toObj = filteredObjects.find(o => o.id === cable.to_object_id);
            return fromObj && toObj;
          }).map(cable => {
            const fromObj = filteredObjects.find(o => o.id === cable.from_object_id);
            const toObj = filteredObjects.find(o => o.id === cable.to_object_id);
            return (
              <Polyline 
                key={`cable-${cable.id}-${cable.cable_type_id}`}
                positions={[[fromObj.latitude, fromObj.longitude], [toObj.latitude, toObj.longitude]]}
                color={cable.cable_type_color || '#3b82f6'}
                weight={3}
                opacity={0.8}
                dashArray={cable.cable_type_name && (cable.cable_type_name.includes('Медный') || cable.cable_type_name === 'Медный') ? '5, 5' : ''}
              >
                <Popup>
                  <div className="cable-popup">
                    <p><strong>{cable.name}</strong></p>
                    <p>{cable.cable_type_name}</p>
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
                          onClick={() => {
                            handleEditCable(cable);
                            setActiveTab('cables');
                          }}
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

          {/* Временная линия кабеля во время рисования */}
          {drawCableMode && cableStartObject && drawingCableEndPoint && (
            (() => {
              const startObj = filteredObjects.find(o => o.id === cableStartObject);
              if (!startObj) return null;
              return (
                <Polyline 
                  positions={[[startObj.latitude, startObj.longitude], [drawingCableEndPoint.lat, drawingCableEndPoint.lng]]}
                  pathOptions={{ 
                    color: '#3b82f6',
                    weight: 3,
                    opacity: 0.7,
                    dashArray: '5, 5'
                  }}
                  interactive={false}
                  className="cable-drawing-temp"
                />
              );
            })()
          )}

          {/* Выделение зависимых объектов */}
          {highlightedDependentObjects.map(objId => {
            const obj = objects.find(o => o.id === objId);
            if (!obj) return null;
            
            const currentZoom = mapRef?.getZoom() || 13;
            
            // Адаптивный размер в зависимости от уровня масштабирования с динамическим коэффициентом
            // Базовый радиус становится больше при меньшем зуме, меньше при большем зуме
            const baseRadius = Math.pow(2, 16 - currentZoom) * 50; 
            const radius = Math.max(50, Math.min(baseRadius, 500)); 
            
            // Вес линии масштабируется обратно пропорционально зуму
            const weight = Math.max(2, 5 - Math.floor(currentZoom / 5));
            
            // Прозрачность немного увеличивается при меньшем зуме для видимости
            const opacity = Math.min(0.9, 0.7 + (20 - currentZoom) * 0.02);
            const fillOpacity = Math.min(0.6, 0.3 + (20 - currentZoom) * 0.02);
            
            return (
              <Circle
                key={`highlight-${objId}`}
                center={[obj.latitude, obj.longitude]}
                radius={radius}
                pathOptions={{
                  color: '#fbbf24',
                  fillColor: '#fbbf24',
                  weight: weight,
                  opacity: opacity,
                  fillOpacity: fillOpacity,
                  dashArray: '5, 5'
                }}
              />
            );
          })}

          {/* Сетевые объекты в виде маркеров */}
          {filteredObjects.filter(obj => obj && obj.id && visibleObjectTypes.has(obj.object_type)).map(obj => (
            <Marker 
              key={obj.id} 
              position={[obj.latitude, obj.longitude]}
              icon={createMarkerIcon(getObjectTypeEmoji(obj.object_type))}
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
                  
                  // Обрабатываем только левую кнопку мыши на маркерах
                  if (e.originalEvent.button !== 0) return;
                  
                  e.originalEvent.stopPropagation();
                  
                  if (!cableStartObjectRef.current) {
                    // первая метка - начало кабеля
                    cableStartObjectRef.current = obj.id;
                    setCableStartObject(obj.id);
                    showToolsNotification(`Начало: ${obj.name}`);
                  } else if (cableStartObjectRef.current !== obj.id) {
                    // вторая метка - завершение кабеля
                    const startObjId = cableStartObjectRef.current;
                    setCableForm(prev => ({
                      ...prev,
                      from_object_id: startObjId,
                      to_object_id: obj.id
                    }));
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
                    // Первая метка - начало кабеля
                    cableStartObjectRef.current = obj.id;
                    setCableStartObject(obj.id);
                    showToolsNotification(`Начало: ${obj.name}`);
                  } else if (cableStartObjectRef.current !== obj.id) {
                    // Вторая метка - завершаем кабель
                    const startObjId = cableStartObjectRef.current;
                    setCableForm(prev => ({
                      ...prev,
                      from_object_id: startObjId,
                      to_object_id: obj.id
                    }));
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
                  <p><strong>{obj.name}</strong></p>
                  <p>{obj.display_name}</p>
                  <small>{obj.latitude.toFixed(4)}, {obj.longitude.toFixed(4)}</small>
                  <div className="popup-actions" style={{ marginTop: '8px', display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => {
                        handleEditObject(obj);
                        setActiveTab('objects');
                      }}
                      className="btn-icon"
                      title="Редактировать"
                      style={{ flex: 1, padding: '4px 6px', fontSize: '12px' }}
                    >
                      ✏️ Редакт
                    </button>
                    <button
                      onClick={() => {
                        console.log('Delete clicked on obj:', obj, 'ID:', obj.id, 'Type:', typeof obj.id);
                        handleDeleteObject(obj.id);
                      }}
                      className="btn-icon"
                      title="Удалить"
                      style={{ flex: 1, padding: '4px 6px', fontSize: '12px' }}
                    >
                      🗑️ Удалить
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Точки измерения */}
          {measurePoints.map((point, idx) => {
            let segmentDistance = null;
            if (idx > 0) {
              segmentDistance = calculateDistance(measurePoints[idx - 1], point);
            }
            
            let cumulativeDistance = 0;
            for (let i = 1; i <= idx; i++) {
              cumulativeDistance += calculateDistance(measurePoints[i - 1], measurePoints[i]);
            }
            
            return (
              <React.Fragment key={`measure-${idx}`}>
                <Circle 
                  center={point} 
                  radius={20}
                  pathOptions={{ color: '#ff6b6b', fillColor: '#ff6b6b', weight: 2 }}
                />
                <Popup
                  position={point}
                  closeButton={false}
                  autoClose={false}
                  closeOnClick={false}
                >
                  <div style={{ textAlign: 'center', minWidth: '100px' }}>
                    <strong>Точка {idx + 1}</strong><br />
                    {segmentDistance !== null && (
                      <>
                        Сегмент: {segmentDistance.toFixed(2)} км<br />
                      </>
                    )}
                    Итого: {cumulativeDistance.toFixed(2)} км
                  </div>
                </Popup>
              </React.Fragment>
            );
          })}
          
          {/* Линия измерения */}
          {measurePoints.length > 1 && (
            <Polyline 
              positions={measurePoints} 
              pathOptions={{ color: '#ff6b6b', dashArray: '5, 5', weight: 2 }}
            />
          )}

          {/* Выделение прямоугольника */}
          {selectionBounds && selectMode && (
            <>
              <Polyline 
                positions={[
                  [selectionBounds.south, selectionBounds.west],
                  [selectionBounds.south, selectionBounds.east],
                  [selectionBounds.north, selectionBounds.east],
                  [selectionBounds.north, selectionBounds.west],
                  [selectionBounds.south, selectionBounds.west]
                ]}
                pathOptions={{ color: '#7c3aed', weight: 2, dashArray: '4, 4' }}
              />
            </>
          )}
        </MapContainer>

        {toolsNotification && (
          <ToolsNotification key={toolsNotificationKey} message={toolsNotification} duration={2500} />
        )}

        <MapToolsBar
          measureMode={measureMode}
          drawCableMode={drawCableMode}
          drawingMode={drawingMode}
          measurePoints={measurePoints}
          highlightedDependentObjects={highlightedDependentObjects}
          onMeasureToggle={handleMeasureClick}
          onDrawCableToggle={handleDrawCableModeToggle}
          onDrawingToggle={handleDrawingModeToggle}
          onClearMeasurements={() => { setMeasurePoints([]); setSelectionBounds(null); }}
          onClearDependentHighlight={handleClearDependentHighlight}
          tileLayer={tileLayer}
          setTileLayer={setTileLayer}
          objectTypes={objectTypes}
          visibleObjectTypes={visibleObjectTypes}
          toggleObjectTypeVisibility={toggleObjectTypeVisibility}
          cableTypes={cableTypes}
          visibleCableTypes={visibleCableTypes}
          toggleCableTypeVisibility={toggleCableTypeVisibility}
        />

        <div className="map-search-wrapper">
          <MapSearch onLocationSelect={handleLocationSelect} />
        </div>
      </div>

      {drawingMode && (
        <DrawingMode
          mapRef={mapRef}
          isActive={drawingMode}
          onClose={() => setDrawingMode(false)}
          drawnItems={drawnShapes}
          setDrawnItems={setDrawnShapes}
        />
      )}
      <MapEditorSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sidebarVisible={sidebarVisible}
        setSidebarVisible={setSidebarVisible}
        formHeight={formHeight}
        setFormHeight={setFormHeight}
        isResizing={isResizing}
        setIsResizing={setIsResizing}
        isMobile={isMobile}
        objectsForm={objectForm}
        onObjectsFormChange={handleObjectInputChange}
        onObjectSubmit={(e) => editingObjectId ? handleUpdateObject(e) : handleAddObject(e)}
        onObjectCancel={() => {
          setEditingObjectId(null);
          setObjectForm({
            name: '',
            object_type_id: 1,
            latitude: mapPosition[0],
            longitude: mapPosition[1],
            address: ''
          });
        }}
        isEditingObject={!!editingObjectId}
        isLoadingObject={loading}
        pickingCoordinates={pickingCoordinates}
        onPickingCoordinatesToggle={() => {
          setPickingCoordinates(prev => !prev);
          if (!pickingCoordinates) {
            showToolsNotification('🗺️ Нажмите на карте для выбора');
          }
        }}
        objectsList={filteredObjects.filter(o => o && o.id)}
        onEditObject={handleEditObject}
        onDeleteObject={handleDeleteObject}
        objectsSearchTerm={objectsSearchTerm}
        setObjectsSearchTerm={setObjectsSearchTerm}
        objectsQuickFilters={objectsQuickFilters}
        setObjectsQuickFilters={setObjectsQuickFilters}
        addressLoading={addressLoading}
        cablesForm={cableForm}
        onCablesFormChange={handleCableInputChange}
        onCablesSubmit={(e) => editingCableId ? handleUpdateCable(e) : handleAddCable(e)}
        onCablesCancel={() => {
          setEditingCableId(null);
          setCableForm({
            name: '',
            cable_type: 'optical',
            from_object_id: '',
            to_object_id: '',
            fiber_count: '',
            distance_km: ''
          });
        }}
        isEditingCable={!!editingCableId}
        isLoadingCable={cableLoading}
        cablesList={filteredCables}
        onEditCable={handleEditCable}
        onDeleteCable={handleDeleteCable}
        cablesSearchTerm={cablesSearchTerm}
        setCablesSearchTerm={setCablesSearchTerm}
        cablesQuickFilters={cablesQuickFilters}
        setCablesQuickFilters={setCablesQuickFilters}
        objectTypes={objectTypes}
        cableTypes={cableTypes}
        objectTypeEmojis={objectTypeEmojiMap}
        objectTypeNames={objectTypeNameMap}
        getCableColor={getCableColor}
        objects={filteredObjects}
      />

      {/* Подтвердение */}
      {confirmDialog.isOpen && (
        <div className="modal-overlay" onClick={confirmDialog.onCancel}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <h2>{confirmDialog.title}</h2>
            <p>{confirmDialog.message}</p>
            <div className="modal-buttons">
              <button 
                onClick={confirmDialog.onConfirm}
                className="btn-primary"
                style={{ flex: 1 }}
              >
                ✓ Удалить
              </button>
              <button 
                onClick={confirmDialog.onCancel}
                className="btn-secondary"
                style={{ flex: 1 }}
              >
                ✕ Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          position={toast.position || 'bottom-left'}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default MapEditor;
