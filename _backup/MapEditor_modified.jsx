import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Toast from './Toast';
import ToolsNotification from './ToolsNotification';
import authService from '../services/authService';
import { referenceService } from '../services/referenceService';
import './MapEditor.css';

// Fix default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const objectTypeEmojis = {
  node: '⚙️',
  coupling: '📦',
  cabinet: '🗃️',
  splitter: '🔀',
  subscriber: '🏠',
  pole: '⚡',
  well: '🕳️',
  camera: '📷',
  wifi: '📡'
};

const objectTypeNames = {
  node: 'Узел',
  coupling: 'муфта',
  cabinet: 'Шкаф',
  splitter: 'Сплиттер',
  subscriber: 'Абонент',
  pole: 'Столб',
  well: 'Колодец',
  camera: 'Камера',
  wifi: 'Wi-Fi'
};

const cableTypeColors = {
  optical: '#4a9eff',
  copper: '#f59e0b'
};

// Создание кастомной иконки маркера с эмодзи
const createMarkerIcon = (emoji, highlight = false) => {
  return L.divIcon({
    html: `<div style="
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      background-color: ${highlight ? '#34d399' : '#1a1a1a'};
      border: 2px solid ${highlight ? '#34d399' : '#d1d5db'};
      border-radius: 50%;
      font-size: 20px;
      box-shadow: ${highlight ? '0 0 12px rgba(52, 211, 153, 0.8)' : '0 2px 8px rgba(0, 0, 0, 0.5)'};
      cursor: pointer;
      transition: all 0.2s ease;
    ">${emoji}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
    className: 'custom-marker-icon',
    // Expand hit area for easier clicking
    shadowSize: [56, 56],
    shadowAnchor: [28, 28]
  });
};

// Map events handler component
function MapEvents({ measureMode, selectMode, addingPoint, pickingCoordinates, drawCableMode, onMapClick, onSelectMode, onMapMouseMove }) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const map = useMapEvents({
    mousedown(e) {
      // Right click doesn't disable dragging
      if (e.originalEvent.button === 2) {
        return;
      }
      
      if (addingPoint || pickingCoordinates || drawCableMode) {
        // Prevent map dragging when adding point, picking coordinates, or drawing cable
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
      // Report mouse move for cable drawing
      if (drawCableMode) {
        onMapMouseMove(e.latlng);
      }
    },
    mouseup() {
      if (isDrawing) {
        setIsDrawing(false);
      }
      // Re-enable dragging
      map.dragging.enable();
    },
    click(e) {
      if (addingPoint || pickingCoordinates) {
        onMapClick(e);
      } else if (measureMode && !selectMode) {
        onMapClick(e);
      }
    },
    contextmenu(e) {
      // Prevent context menu during cable drawing
      if (drawCableMode) {
        e.originalEvent.preventDefault();
      }
    }
  });
  return null;
}

function MapEditor({ objects, onObjectsChange, sidebarVisible, setSidebarVisible }) {
  const [mapPosition, setMapPosition] = useState([55.7558, 37.6173]);
  const [activeTab, setActiveTab] = useState('objects');
  const [cables, setCables] = useState([]);
  const [formHeight, setFormHeight] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  
  // Reference data states
  const [objectTypes, setObjectTypes] = useState([]);
  const [cableTypes, setCableTypes] = useState([]);
  const [loadingReferences, setLoadingReferences] = useState(true);
  
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
    cable_type_id: 1,
    from_object_id: '',
    to_object_id: '',
    fiber_count: 12,
    distance_km: ''
  });

  const [loading, setLoading] = useState(false);
  const [cableLoading, setCableLoading] = useState(false);
  const [editingObjectId, setEditingObjectId] = useState(null);
  const [editingCableId, setEditingCableId] = useState(null);
  const [toast, setToast] = useState(null);
  const [tileLayer, setTileLayer] = useState('osm'); // osm, satellite, terrain
  const [measureMode, setMeasureMode] = useState(false);
  const [measurePoints, setMeasurePoints] = useState([]);
  const [selectMode, setSelectMode] = useState(false);
  const [selectionBounds, setSelectionBounds] = useState(null);
  const [toolsNotification, setToolsNotification] = useState(null);
  const [toolsNotificationKey, setToolsNotificationKey] = useState(0);
  const [mapRef, setMapRef] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1025);
  const [pickingCoordinates, setPickingCoordinates] = useState(false);
  const [addingPoint, setAddingPoint] = useState(false);
  const [draggedCableId, setDraggedCableId] = useState(null);
  const [dragTargetObjectId, setDragTargetObjectId] = useState(null);
  const [drawCableMode, setDrawCableMode] = useState(false);
  const [cableStartObject, setCableStartObject] = useState(null);
  const [drawingCableEndPoint, setDrawingCableEndPoint] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null
  });
  
  // Helper function to show tools notification with key update
  const showToolsNotification = (message) => {
    setToolsNotification(message);
    setToolsNotificationKey(prev => prev + 1);
  };

  useEffect(() => {
    fetchCables();
    loadReferenceData();
  }, []);

  // Load reference data (object types and cable types)
  const loadReferenceData = async () => {
    try {
      setLoadingReferences(true);
      const [objTypes, cabTypes] = await Promise.all([
        referenceService.getObjectTypes(),
        referenceService.getCableTypes()
      ]);
      setObjectTypes(objTypes);
      setCableTypes(cabTypes);
      
      // Set default values if data loaded
      if (objTypes.length > 0 && objectForm.object_type_id === 1) {
        setObjectForm(prev => ({ ...prev, object_type_id: objTypes[0].object_type_id }));
      }
      if (cabTypes.length > 0 && cableForm.cable_type_id === 1) {
        setCableForm(prev => ({ ...prev, cable_type_id: cabTypes[0].cable_type_id }));
      }
    } catch (error) {
      console.error('Failed to load reference data:', error);
      showToast('Ошибка при загрузке справочных данных', 'error');
    } finally {
      setLoadingReferences(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger shortcuts if typing in input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // M key: Toggle measurement mode (using e.code for language independence)
      if (e.code === 'KeyM') {
        e.preventDefault();
        setMeasureMode(prev => {
          const newMode = !prev;
          if (newMode) {
            setSelectMode(false);
            setToolsNotification('Measurement mode enabled');
            setToolsNotificationKey(k => k + 1);
          }
          return newMode;
        });
      }
      // S key: Toggle selection mode
      if (e.code === 'KeyS') {
        e.preventDefault();
        setSelectMode(prev => {
          const newMode = !prev;
          if (newMode) {
            setMeasureMode(false);
            setToolsNotification('Selection mode enabled');
            setToolsNotificationKey(k => k + 1);
          } else {
            setSelectionBounds(null);
          }
          return newMode;
        });
      }
      // C key: Clear measurements/selections
      if (e.code === 'KeyC') {
        e.preventDefault();
        setMeasurePoints([]);
        setSelectionBounds(null);
      }
      // P key: Toggle point adding mode
      if (e.code === 'KeyP') {
        e.preventDefault();
        setAddingPoint(prev => {
          const newMode = !prev;
          if (newMode) {
            setMeasureMode(false);
            setSelectMode(false);
            setDrawCableMode(false);
            showToolsNotification('📍 Нажмите на карте для добавления точки');
          }
          return newMode;
        });
      }
      // K key: Toggle cable drawing mode
      if (e.code === 'KeyK') {
        e.preventDefault();
        handleDrawCableModeToggle();
      }
      // Escape key: Cancel current mode
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

  // Handle cable drawing - clear end point on mouseup if not over marker
  useEffect(() => {
    if (!drawCableMode) return;

    const handleGlobalMouseDown = (e) => {
      // Right click - cancel current cable drawing (reset start point)
      if (e.button === 2) {
        e.preventDefault();
        if (cableStartObjectRef.current) {
          cableStartObjectRef.current = null;
          setCableStartObject(null);
          setDrawingCableEndPoint(null);
          showToolsNotification('📍 Кабель отменён, выберите новую начальную метку');
        }
        return;
      }
    };

    const handleGlobalMouseUp = (e) => {
      // Check if mouse is over a marker
      if (cableStartObjectRef.current && e.target && e.target.closest('.leaflet-marker-icon')) {
        // Let the marker's mousedown handler deal with it
        return;
      }
      // If mouseup is not on a marker, clear the end point
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

  // Handle window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const isMobileNow = width < 1025;
      setIsMobile(isMobileNow);
      // Auto-close sidebar when resizing to mobile
      if (isMobileNow) {
        setSidebarVisible(false);
      } else {
        // Auto-open sidebar when resizing to desktop
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
      setCables(data);
    } catch (error) {
      console.error('Error fetching cables:', error);
    }
  };

  // Measurement tool functions
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
    // Handle adding new point
    if (addingPoint) {
      setObjectForm({
        name: '',
        object_type: 'node',
        latitude: parseFloat(e.latlng.lat.toFixed(6)),
        longitude: parseFloat(e.latlng.lng.toFixed(6))
      });
      setAddingPoint(false);
      setActiveTab('objects');
      showToolsNotification('✓ Введите название и добавьте объект');
      return;
    }

    // Handle coordinate picking for existing object
    if (pickingCoordinates) {
      setObjectForm(prev => ({
        ...prev,
        latitude: parseFloat(e.latlng.lat.toFixed(6)),
        longitude: parseFloat(e.latlng.lng.toFixed(6))
      }));
      setPickingCoordinates(false);
      showToolsNotification('✓ Координаты установлены');
      return;
    }

    if (measureMode) {
      const newPoint = [e.latlng.lat, e.latlng.lng];
      const newPoints = [...measurePoints, newPoint];
      setMeasurePoints(newPoints);
    }
  };

  const calculateDistance = (point1, point2) => {
    const R = 6371; // Earth radius in km
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
    
    if (name === 'from_object_id' || name === 'to_object_id' || name === 'fiber_count') {
      parsedValue = value ? parseInt(value) : '';
    } else if (name === 'distance_km') {
      parsedValue = value ? parseFloat(value) : '';
    }
    
    const updatedForm = {
      ...cableForm,
      [name]: parsedValue
    };
    
    // Auto-calculate distance if both objects are selected
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
      const response = await authService.authenticatedFetch('http://localhost:8000/api/network-objects/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(objectForm)
      });
      if (response.ok) {
        setToast({ message: 'Объект создан', type: 'success' });
        setObjectForm({
          name: '',
          object_type_id: objectTypes[0]?.object_type_id || 1,
          latitude: mapPosition[0],
          longitude: mapPosition[1],
          address: ''
        });
        onObjectsChange();
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
      const cableType = cableTypes.find(t => t.cable_type_id === cableForm.cable_type_id);
      const response = await authService.authenticatedFetch('http://localhost:8000/api/cables/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cableForm.name,
          cable_type_id: cableForm.cable_type_id,
          from_object_id: cableForm.from_object_id,
          to_object_id: cableForm.to_object_id,
          fiber_count: cableType?.fiber_count ? cableForm.fiber_count : null,
          distance_km: cableForm.distance_km || null
        })
      });
      if (response.ok) {
        setToast({ message: 'Кабель создан', type: 'success' });
        setCableForm({
          name: '',
          cable_type_id: cableTypes[0]?.cable_type_id || 1,
          from_object_id: '',
          to_object_id: '',
          fiber_count: 12,
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

  // Функция для объединения кабелей через drag-n-drop
  const handleMergeCables = (cableId, targetObjectId) => {
    const cable = cables.find(c => c.id === cableId);
    if (!cable) return;

    // Если перетащили конец кабеля на другой объект, перенаправляем кабель
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

  // Функция для начала рисования кабеля между объектами
  const handleStartDrawCable = (objectId) => {
    if (!drawCableMode) return;
    
    if (!cableStartObjectRef.current) {
      // Первый клик - запомнили начальный объект
      cableStartObjectRef.current = objectId;
      setCableStartObject(objectId);
      showToolsNotification(`📍 Начало: ${objects.find(o => o.id === objectId)?.name}`);
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
      setMeasurePoints([]);
      setSelectionBounds(null);
      showToolsNotification('🔗 ЛКМ: метка 1 → метка 2 | ПКМ: отмена');
    }
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
          // Delete all connected cables
          for (const cable of relatedCables) {
            await authService.authenticatedFetch(`http://localhost:8000/api/cables/${cable.id}`, {
              method: 'DELETE'
            });
          }
          // Delete object
          await authService.authenticatedFetch(`http://localhost:8000/api/network-objects/${objectId}`, {
            method: 'DELETE'
          });
          setToast({ message: 'Объект удален', type: 'success' });
          setEditingObjectId(null);
          setObjectForm({
            name: '',
            object_type: 'node',
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
    setCableForm({
      name: cable.name,
      cable_type_id: cable.cable_type_id,
      from_object_id: cable.from_object_id,
      to_object_id: cable.to_object_id,
      fiber_count: cable.fiber_count || 12,
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
        object_type_id: objectTypes[0]?.object_type_id || 1,
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
      const cableType = cableTypes.find(t => t.cable_type_id === cableForm.cable_type_id);
      await authService.authenticatedFetch(`http://localhost:8000/api/cables/${editingCableId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cableForm.name,
          cable_type_id: cableForm.cable_type_id,
          from_object_id: cableForm.from_object_id,
          to_object_id: cableForm.to_object_id,
          fiber_count: cableType?.fiber_count ? cableForm.fiber_count : null,
          distance_km: cableForm.distance_km || null
        })
      });
      setToast({ message: 'Кабель обновлён', type: 'success' });
      setEditingCableId(null);
      setCableForm({
        name: '',
        cable_type_id: cableTypes[0]?.cable_type_id || 1,
        from_object_id: '',
        to_object_id: '',
        fiber_count: 12,
        distance_km: ''
      });
      fetchCables();
    } catch (error) {
      console.error('Error updating cable:', error);
      setToast({ message: 'Ошибка обновления кабеля', type: 'error' });
    } finally {
      setCableLoading(false);
    }
  };

  const getCableColor = (cableTypeId) => {
    const cableType = cableTypes.find(t => t.cable_type_id === cableTypeId);
    if (cableType && cableType.color) {
      return '#' + cableType.color;
    }
    return '#4a9eff'; // default color
  };

  const getObjectTypeEmoji = (objectTypeId) => {
    const emojis = {
      'Узел': '⚙️',
      'Муфта': '📦',
      'Шкаф': '🗃️',
      'Сплиттер': '🔀',
      'Абонент': '🏠',
      'Столб': '⚡',
      'Колодец': '🕳️',
      'Камера': '📷',
      'Wi-Fi': '📡'
    };
    const objType = objectTypes.find(t => t.object_type_id === objectTypeId);
    return objType ? emojis[objType.object_name] || '📍' : '📍';
  };

  const getObjectTypeName = (objectTypeId) => {
    const objType = objectTypes.find(t => t.object_type_id === objectTypeId);
    return objType ? objType.object_name : 'Неизвестный';
  };

  const getCableTypeName = (cableTypeId) => {
    const cableType = cableTypes.find(t => t.cable_type_id === cableTypeId);
    return cableType ? cableType.name : 'Неизвестный';
  };

  // Get ALL dependent objects for a cable (recursively through the network)
  const getDependentObjects = (cable) => {
    const allDependentIds = new Set();
    const visited = new Set();
    
    // BFS to find all connected objects
    const queue = [cable.from_object_id, cable.to_object_id];
    
    while (queue.length > 0) {
      const currentObjectId = queue.shift();
      
      if (visited.has(currentObjectId)) continue;
      visited.add(currentObjectId);
      allDependentIds.add(currentObjectId);
      
      // Find all cables connected to this object
      cables.forEach(c => {
        let otherEnd = null;
        
        if (c.from_object_id === currentObjectId) {
          otherEnd = c.to_object_id;
        } else if (c.to_object_id === currentObjectId) {
          otherEnd = c.from_object_id;
        }
        
        // If we found a connected cable, add the other end to the queue
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

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      e.preventDefault();
      
      const sidebar = document.querySelector('.sidebar');
      const tabs = document.querySelector('.sidebar-tabs');
      if (!sidebar || !tabs) return;
      
      const sidebarRect = sidebar.getBoundingClientRect();
      const tabsRect = tabs.getBoundingClientRect();
      
      // Расстояние от нижней части tabs до позиции мыши
      const newHeight = Math.max(50, e.clientY - tabsRect.bottom);
      
      // Максимум: оставляем только 50px для списка внизу
      const maxFormHeight = sidebarRect.height - (tabsRect.bottom - sidebarRect.top) - 50;
      
      console.log('Sidebar height:', sidebarRect.height, 'Tabs bottom offset:', tabsRect.bottom - sidebarRect.top, 'New height:', newHeight, 'Max:', maxFormHeight);
      
      if (newHeight <= maxFormHeight) {
        setFormHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.userSelect = 'auto';
      document.body.style.cursor = 'auto';
    };

    if (isResizing) {
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'row-resize';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Trigger re-render when zoom changes to update highlight sizes dynamically
  useEffect(() => {
    if (!mapRef || highlightedDependentObjects.length === 0) return;

    const handleZoomChange = () => {
      // Force re-render by creating a new reference
      setHighlightedDependentObjects(prev => [...prev]);
    };

    mapRef.on('zoom', handleZoomChange);
    return () => {
      mapRef.off('zoom', handleZoomChange);
    };
  }, [mapRef, highlightedDependentObjects.length]);

  // Auto-calculate cable distance when from/to objects change
  useEffect(() => {
    if (cableForm.from_object_id && cableForm.to_object_id) {
      const fromObj = objects.find(o => o.id === cableForm.from_object_id);
      const toObj = objects.find(o => o.id === cableForm.to_object_id);
      
      if (fromObj && toObj) {
        const distance = parseFloat(calculateDistance(
          [fromObj.latitude, fromObj.longitude],
          [toObj.latitude, toObj.longitude]
        ).toFixed(3));
        
        // Only update if distance changed
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
          className="leaflet-map"
          style={{ height: '100%', width: '100%' }}
          ref={setMapRef}
        >
          <MapEvents 
            measureMode={measureMode} 
            selectMode={selectMode}
            addingPoint={addingPoint}
            pickingCoordinates={pickingCoordinates}
            drawCableMode={drawCableMode}
            onMapClick={handleMapClick}
            onSelectMode={handleSelectionMode}
            onMapMouseMove={handleMapMouseMove}
          />
          <TileLayer
            url={getTileLayerUrl()}
            attribution={getTileLayerAttribution()}
          />
          
          
          {/* Draw cables as lines */}
          {cables.filter(cable => {
            const fromObj = objects.find(o => o.id === cable.from_object_id);
            const toObj = objects.find(o => o.id === cable.to_object_id);
            return fromObj && toObj;
          }).map(cable => {
            const fromObj = objects.find(o => o.id === cable.from_object_id);
            const toObj = objects.find(o => o.id === cable.to_object_id);
            return (
              <Polyline 
                key={`cable-${cable.id}`}
                positions={[[fromObj.latitude, fromObj.longitude], [toObj.latitude, toObj.longitude]]}
                color={getCableColor(cable.cable_type_id)}
                weight={3}
                opacity={0.8}
                dashArray={cableTypes.find(t => t.cable_type_id === cable.cable_type_id)?.fiber_count ? '' : '5, 5'}
              >
                <Popup>
                  <div className="cable-popup">
                    <p><strong>{cable.name}</strong></p>
                    <p>{getCableTypeName(cable.cable_type_id)}</p>
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

          {/* Draw temporary cable line while drawing */}
          {drawCableMode && cableStartObject && drawingCableEndPoint && (
            (() => {
              const startObj = objects.find(o => o.id === cableStartObject);
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

          {/* Highlight dependent objects */}
          {highlightedDependentObjects.map(objId => {
            const obj = objects.find(o => o.id === objId);
            if (!obj) return null;
            
            // Get current zoom level from map
            const currentZoom = mapRef?.getZoom() || 13;
            
            // Adaptive sizing based on zoom level with dynamic coefficient
            // Base radius gets larger on lower zoom, smaller on higher zoom
            const baseRadius = Math.pow(2, 16 - currentZoom) * 50; // Dynamic base calculation
            const radius = Math.max(50, Math.min(baseRadius, 500)); // Clamp between 50-500
            
            // Weight scales inversely with zoom
            const weight = Math.max(2, 5 - Math.floor(currentZoom / 5));
            
            // Opacity increases slightly at lower zoom for visibility
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

          {/* Draw network objects as markers */}
          {objects.filter(obj => obj && obj.id).map(obj => (
            <Marker 
              key={obj.id} 
              position={[obj.latitude, obj.longitude]}
              icon={createMarkerIcon(getObjectTypeEmoji(obj.object_type_id) || '📍')}
              ref={(ref) => {
                // Сохраняем ref маркера для последующих манипуляций
                if (ref && ref.leafletElement) {
                  markerRefsMap.current[obj.id] = ref.leafletElement;
                } else if (ref) {
                  markerRefsMap.current[obj.id] = ref;
                }
              }}
              eventHandlers={{
                mousedown: (e) => {
                  if (!drawCableMode) return;
                  
                  // Only handle left mouse button on markers
                  if (e.originalEvent.button !== 0) return;
                  
                  e.originalEvent.stopPropagation();
                  
                  if (!cableStartObjectRef.current) {
                    // First marker - set start
                    cableStartObjectRef.current = obj.id;
                    setCableStartObject(obj.id);
                    showToolsNotification(`📍 Начало: ${obj.name}`);
                  } else if (cableStartObjectRef.current !== obj.id) {
                    // Second marker - complete cable
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
                    // Clicking same marker again - reset
                    cableStartObjectRef.current = null;
                    setCableStartObject(null);
                    setDrawingCableEndPoint(null);
                    showToolsNotification('📍 Сброс начальной метки');
                  }
                },
                click: (e) => {
                  // Fallback for click event (in case mousedown doesn't work)
                  if (!drawCableMode) return;
                  
                  e.originalEvent.stopPropagation();
                  
                  if (!cableStartObjectRef.current) {
                    // First marker - set start
                    cableStartObjectRef.current = obj.id;
                    setCableStartObject(obj.id);
                    showToolsNotification(`📍 Начало: ${obj.name}`);
                  } else if (cableStartObjectRef.current !== obj.id) {
                    // Second marker - complete cable
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
                  <p>{getObjectTypeName(obj.object_type_id)}</p>
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

          {/* Measurement points visualization */}
          {measurePoints.map((point, idx) => {
            let segmentDistance = null;
            if (idx > 0) {
              segmentDistance = calculateDistance(measurePoints[idx - 1], point);
            }
            
            // Calculate cumulative distance
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
          
          {/* Measurement line */}
          {measurePoints.length > 1 && (
            <Polyline 
              positions={measurePoints} 
              pathOptions={{ color: '#ff6b6b', dashArray: '5, 5', weight: 2 }}
            />
          )}

          {/* Selection rectangle */}
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
              {/* Highlight selected objects */}
              {getObjectsInBounds().map(obj => (
                <Circle
                  key={`selected-${obj.id}`}
                  center={[obj.latitude, obj.longitude]}
                  radius={40}
                  pathOptions={{ 
                    color: '#7c3aed', 
                    fillColor: '#7c3aed', 
                    weight: 2,
                    opacity: 0.3,
                    fillOpacity: 0.1
                  }}
                />
              ))}
            </>
          )}
        </MapContainer>

        {toolsNotification && (
          <ToolsNotification key={toolsNotificationKey} message={toolsNotification} duration={2500} />
        )}

        <div className="map-tools-panel">
          <div className="tools-group" title="М: Измерить | В: Выбрать | К: Кабель | О: Очистить">
            <button 
              className={`tool-btn ${measureMode ? 'active' : ''}`}
              onClick={handleMeasureClick}
              title="Измерить расстояние - Нажмите М (2+ клик)"
            >
              📏
            </button>
            <button 
              className={`tool-btn ${selectMode ? 'active' : ''}`}
              onClick={handleSelectMode}
              title="Выбрать объекты - Нажмите В (нарисуйте прямоугольник)"
            >
              🔲
            </button>
            <button 
              className={`tool-btn ${drawCableMode ? 'active' : ''}`}
              onClick={handleDrawCableModeToggle}
              title="Рисовать кабель - Нажмите К (нажмите и перетащите между метками)"
            >
              🔗
            </button>
            {(measurePoints.length > 0 || selectionBounds) && (
              <button 
                className="tool-btn tool-btn-danger"
                onClick={() => {
                  setMeasurePoints([]);
                  setSelectionBounds(null);
                }}
                title="Очистить измерение/выделение - Нажмите О"
              >
                ✕
              </button>
            )}
            {highlightedDependentObjects.length > 0 && (
              <button 
                className="tool-btn tool-btn-warning"
                onClick={handleClearDependentHighlight}
                title="Очистить подсвечивание объектов"
              >
                🔇
              </button>
            )}
          </div>

          <select 
            value={tileLayer} 
            onChange={(e) => setTileLayer(e.target.value)}
            className="layer-select"
            title="На стиль карты"
          >
            <option value="osm">🗺️ OSM</option>
            <option value="satellite">🛰️ Космос</option>
            <option value="terrain">⛰️ Тер</option>
          </select>
        </div>

        {toolsNotification && (
          <ToolsNotification key={toolsNotificationKey} message={toolsNotification} duration={2500} />
        )}
      </div>

      <aside className={`sidebar ${!isMobile || sidebarVisible ? 'visible' : ''}`}>
        {/* Close button for mobile/tablet - shown by CSS media query */}
        <button
          type="button"
          className="sidebar-close-btn"
          onClick={() => setSidebarVisible(false)}
          title="Hide panel"
          aria-label="Close sidebar"
        >
          ✕
        </button>
        
        <div className="sidebar-tabs">
          <button 
            className={`sidebar-tab ${activeTab === 'objects' ? 'active' : ''}`}
            onClick={() => setActiveTab('objects')}
          >
            📍 Объекты
          </button>
          <button 
            className={`sidebar-tab ${activeTab === 'cables' ? 'active' : ''}`}
            onClick={() => setActiveTab('cables')}
          >
            🔗 Кабели
          </button>
        </div>

        {activeTab === 'objects' && (
          <>
            <div className="sidebar-form-section" style={{ maxHeight: `${formHeight}px` }}>
              <div className="sidebar-header">
                <h3>{editingObjectId ? '✏️ Редактировать объект' : '➕ Новый объект'}</h3>
              </div>

              <form onSubmit={editingObjectId ? handleUpdateObject : handleAddObject} className="add-form">
                <div className="form-group">
                  <label>Имя объекта</label>
                  <input
                    type="text"
                    name="name"
                    value={objectForm.name}
                    onChange={handleObjectInputChange}
                    placeholder="Введите имя..."
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Тип</label>
                  <select 
                    name="object_type_id" 
                    value={objectForm.object_type_id}
                    onChange={handleObjectInputChange}
                  >
                    {objectTypes.map(type => (
                      <option key={type.object_type_id} value={type.object_type_id}>
                        {getObjectTypeEmoji(type.object_type_id)} {type.object_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Широта</label>
                  <input
                    type="number"
                    name="latitude"
                    value={objectForm.latitude}
                    onChange={handleObjectInputChange}
                    step="0.0001"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Долгота</label>
                  <input
                    type="number"
                    name="longitude"
                    value={objectForm.longitude}
                    onChange={handleObjectInputChange}
                    step="0.0001"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Адрес</label>
                  <input
                    type="text"
                    name="address"
                    value={objectForm.address || ''}
                    onChange={handleObjectInputChange}
                    placeholder="Адрес объекта"
                  />
                </div>

                <div className="form-buttons">
                  <button type="submit" disabled={loading} className="btn-primary">
                    {loading ? '⏳' : editingObjectId ? '✓' : '✚'} {editingObjectId ? 'Обновить' : 'Добавить'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPickingCoordinates(!pickingCoordinates);
                      if (!pickingCoordinates) {
                        showToolsNotification('🗺️ Нажмите на карте для выбора');
                      }
                    }}

                    style={{
                      width: '44px',
                      height: '44px',
                      padding: '0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px',
                      backgroundColor: pickingCoordinates ? '#3b82f6' : '#1f2937',
                      color: pickingCoordinates ? 'white' : '#9ca3af',
                      borderColor: pickingCoordinates ? '#3b82f6' : '#d1d5db',
                      border: `2px solid ${pickingCoordinates ? '#3b82f6' : '#374151'}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      flexShrink: 0
                    }}
                    title="Выбрать координаты с карты"
                  >
                    🔍
                  </button>
                  {editingObjectId && (
                    <button 
                      type="button" 
                      onClick={() => {
                        setEditingObjectId(null);
                        setObjectForm({
                          name: '',
                          object_type: 'node',
                          latitude: mapPosition[0],
                          longitude: mapPosition[1]
                        });
                      }}
                      className="btn-secondary"
                    >
                      ✕ Отмена
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div 
              className="sidebar-resizer"
              onMouseDown={() => setIsResizing(true)}
            />

            <div className="objects-list">
              <h3>📋 Объекты ({objects.filter(o => o && o.id).length})</h3>
              <div className="objects-scroll">
                {objects.filter(o => o && o.id).map(obj => {
                  const isActive = editingObjectId === obj.id || editingObjectId === String(obj.id);
                  if (editingObjectId) {
                    console.log(`Checking obj ${obj.id} (type: ${typeof obj.id}): isActive=${isActive}, editingID=${editingObjectId} (type: ${typeof editingObjectId})`);
                  }
                  return (
                  <div key={obj.id} className={`object-item ${isActive ? 'active' : ''}`}>
                    <span className="object-type">{getObjectTypeEmoji(obj.object_type_id)}</span>
                    <div className="object-info">
                      <strong>{obj.name}</strong>
                      <small>{getObjectTypeName(obj.object_type_id)}</small>
                    </div>
                    <div className="item-actions" style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => handleEditObject(obj)}
                        className="btn-icon"
                        title="Edit"
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => {
                          console.log('Delete clicked on list item:', obj, 'ID:', obj.id, 'Type:', typeof obj.id);
                          handleDeleteObject(obj.id);
                        }}
                        className="btn-icon"
                        title="Delete"
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {activeTab === 'cables' && (
          <>
            <div className="sidebar-form-section" style={{ maxHeight: `${formHeight}px` }}>
              <div className="sidebar-header">
                <h3>{editingCableId ? '✏️ Редактировать кабель' : '➕ Новый кабель'}</h3>
              </div>

              <form onSubmit={editingCableId ? handleUpdateCable : handleAddCable} className="add-form">
              <div className="form-group">
                <label>Имя кабеля</label>
                <input
                  type="text"
                  name="name"
                  value={cableForm.name}
                  onChange={handleCableInputChange}
                  placeholder="Основная линия A"
                  required
                />
              </div>

              <div className="form-group">
                <label>Тип кабеля</label>
                <select 
                  name="cable_type_id" 
                  value={cableForm.cable_type_id}
                  onChange={handleCableInputChange}
                >
                  {cableTypes.map(type => (
                    <option key={type.cable_type_id} value={type.cable_type_id}>
                      {type.name} ({type.fiber_count} волокон) - #{type.color}
                    </option>
                  ))}
                </select>
              </div>

              {cableTypes.find(t => t.cable_type_id === cableForm.cable_type_id)?.fiber_count > 0 && (
                <div className="form-group">
                  <label>Количество волокон</label>
                  <input
                    type="number"
                    name="fiber_count"
                    value={cableForm.fiber_count || 12}
                    onChange={handleCableInputChange}
                    min="1"
                    max="288"
                    required
                  />
                </div>
              )}

              <div className="form-row-pair">
                <div className="form-group">
                  <label>Начало</label>
                  <select 
                    name="from_object_id" 
                    value={cableForm.from_object_id}
                    onChange={handleCableInputChange}
                    required
                  >
                    <option value="">Выбрать...</option>
                    {objects.filter(o => o && o.id).map(obj => (
                      <option key={obj.id} value={obj.id}>
                        {getObjectTypeEmoji(obj.object_type_id)} {obj.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Конец</label>
                  <select 
                    name="to_object_id" 
                    value={cableForm.to_object_id}
                    onChange={handleCableInputChange}
                    required
                  >
                    <option value="">Выбрать...</option>
                    {objects.filter(o => o && o.id).map(obj => (
                      <option key={obj.id} value={obj.id}>
                        {getObjectTypeEmoji(obj.object_type_id)} {obj.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <div className="distance-label-row">
                  <label>Расстояние (км)</label>
                  {cableForm.from_object_id && cableForm.to_object_id && cableForm.distance_km && (
                    <small className="auto-filled-indicator">✓ Авто-расчёт</small>
                  )}
                </div>
                <input
                  type="number"
                  name="distance_km"
                  value={cableForm.distance_km}
                  onChange={handleCableInputChange}
                  step="0.1"
                  placeholder="0.0"
                  className={cableForm.from_object_id && cableForm.to_object_id && cableForm.distance_km ? 'auto-filled' : ''}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" disabled={cableLoading} className="btn-primary" style={{ flex: 1 }}>
                  {cableLoading ? '⏳' : editingCableId ? '✓' : '✚'} {editingCableId ? 'Обновить' : 'Добавить'}
                </button>
                {editingCableId && (
                  <button 
                    type="button" 
                    onClick={() => {
                      setEditingCableId(null);
                      setCableForm({
                        name: '',
                        cable_type: 'optical',
                        from_object_id: '',
                        to_object_id: '',
                        fiber_count: 12,
                        distance_km: ''
                      });
                    }}
                    className="btn-secondary"
                    style={{ flex: 1 }}
                  >
                    ✕ Отмена
                  </button>
                )}
              </div>
              </form>
            </div>

            <div 
              className="sidebar-resizer"
              onMouseDown={() => setIsResizing(true)}
            />

            <div className="cables-list">
              <h3>🔗 Кабели ({cables.length})</h3>
              <div className="cables-scroll">
                {cables.map(cable => {
                  const fromObj = objects.find(o => o.id === cable.from_object_id);
                  const toObj = objects.find(o => o.id === cable.to_object_id);
                  return (
                    <div 
                      key={cable.id} 
                      className={`cable-item ${editingCableId === cable.id ? 'active' : ''}`}
                    >
                      <div className="cable-color" style={{ backgroundColor: getCableColor(cable.cable_type_id) }}></div>
                      <div className="cable-info">
                        <strong>{cable.name}</strong>
                        <small>{fromObj?.name} → {toObj?.name}</small>
                      </div>
                      <div className="cable-type-badge">
                        <span className="cable-tiny">{getCableTypeName(cable.cable_type_id)}{cable.fiber_count ? ` • ${cable.fiber_count}` : ''}</span>
                      </div>
                      <div className="item-actions" style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => handleEditCable(cable)}
                          className="btn-icon"
                          title="Edit"
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteCable(cable.id)}
                          className="btn-icon"
                          title="Delete"
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </aside>

      {/* Confirmation Dialog */}
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
