import React, { useState, useEffect, useRef } from 'react';
import Toast from './Toast';
import authService from '../services/authService';
import './SchemaEditor.css';

const cableTypeNames = {
  optical: 'Оптический',
  copper: 'Медный'
};

function SchemaEditor({ selectedRegions = [], objects = [] }) {
  const [cables, setCables] = useState([]);
  const [selectedCable, setSelectedCable] = useState(null);
  const [splices, setSplices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [regionObjectIds, setRegionObjectIds] = useState(new Set());
  const [selectedFiber, setSelectedFiber] = useState(null); // Для click-based соединения на телефонах
  const [mobileEditorView, setMobileEditorView] = useState(false); // Переключение между списком кабелей и редактором на мобильной версии
  const dragStateRef = useRef(null);
  const svgRef = useRef(null);
  
  // Загружаем объекты для выбранных регионов через API
  useEffect(() => {
    const loadRegionObjects = async () => {
      if (!selectedRegions || selectedRegions.length === 0) {
        setRegionObjectIds(new Set());
        return;
      }
      
      const objectIds = new Set();
      
      for (const region of selectedRegions) {
        try {
          const response = await fetch(`http://localhost:8000/api/regions/${region.region_id}`);
          if (response.ok) {
            const regionData = await response.json();
            if (regionData.network_objects && Array.isArray(regionData.network_objects)) {
              regionData.network_objects.forEach(obj => {
                objectIds.add(obj.network_object_id || obj.id);
              });
            }
          }
        } catch (error) {
          console.error(`Error fetching region ${region.region_id}:`, error);
        }
      }
      
      setRegionObjectIds(objectIds);
    };
    
    loadRegionObjects();
  }, [selectedRegions]);
  
  // Фильтруем кабели по выбранным регионам
  const filteredCables = (() => {
    if (!selectedRegions || selectedRegions.length === 0) {
      // Нет выбранных регионов - показываем все кабели
      return cables;
    }
    
    // Если нет объектов в выбранных регионах возвращаем пустой массив
    if (regionObjectIds.size === 0) {
      return [];
    }
    
    // Фильтруем кабели - оба конца должны быть в выбранных регионах
    return cables.filter(cable => 
      regionObjectIds.has(cable.from_object_id) && regionObjectIds.has(cable.to_object_id)
    );
  })();
  
  // Фильтруем по поиску (название или адрес)
  const searchedCables = filteredCables.filter(cable => {
    const searchLower = searchTerm.toLowerCase();
    
    // Поиск по названию кабеля
    if (cable.name && cable.name.toLowerCase().includes(searchLower)) {
      return true;
    }
    
    // Поиск по адресам объектов (начало и конец)
    const fromObj = objects.find(o => o.id === cable.from_object_id || o.network_object_id === cable.from_object_id);
    const toObj = objects.find(o => o.id === cable.to_object_id || o.network_object_id === cable.to_object_id);
    
    if (fromObj && fromObj.address && fromObj.address.toLowerCase().includes(searchLower)) {
      return true;
    }
    
    if (toObj && toObj.address && toObj.address.toLowerCase().includes(searchLower)) {
      return true;
    }
    
    return false;
  });
  
  // Состояния формы
  const [spliceForm, setSpliceForm] = useState({
    from_fiber: 0,
    to_cable_id: '',
    to_fiber: 0,
    notes: ''
  });
  
  const [editingSpliceId, setEditingSpliceId] = useState(null);
  const [selectedTargetCable, setSelectedTargetCable] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null
  });

  useEffect(() => {
    fetchCables();
  }, []);

  const fetchCables = async () => {
    try {
      const response = await authService.authenticatedFetch('http://localhost:8000/api/cables/');
      const data = await response.json();
      setCables(data);
    } catch (error) {
      console.error('Error fetching cables:', error);
    }
  };

  const fetchSplices = async (cableId) => {
    try {
      setLoading(true);
      const response = await authService.authenticatedFetch(`http://localhost:8000/api/fiber-splices/?cable_id=${cableId}`);
      const data = await response.json();
      setSplices(data);
    } catch (error) {
      console.error('Error fetching splices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCableSelect = (cable) => {
    setSelectedCable(cable);
    setMobileEditorView(true); 
    setEditingSpliceId(null);
    setSpliceForm({
      from_fiber: 0,
      to_cable_id: '',
      to_fiber: 0,
      notes: ''
    });
    fetchSplices(cable.id);
  };

  const handleSpliceFormChange = (e) => {
    const { name, value } = e.target;
    setSpliceForm(prev => ({
      ...prev,
      [name]: name === 'from_fiber' || name === 'to_fiber' || name === 'to_cable_id' 
        ? (name === 'to_cable_id' ? value : parseInt(value))
        : value
    }));
  };

  // Валидация волокна в кабеле
  const validateFiber = (fiberNumber, cableId) => {
    const cable = cables.find(c => c.id === cableId);
    if (!cable) return { valid: false, message: 'Кабель не найден' };
    
    if (!cable.fiber_count) {
      return { 
        valid: false, 
        message: `Для этого кабеля не указано количество волокон. Это возможно не оптический кабель (тип: ${cableTypeNames[cable.cable_type]}).` 
      };
    }
    
    if (fiberNumber >= cable.fiber_count || fiberNumber < 0) {
      return { 
        valid: false, 
        message: `Волокно ${fiberNumber} не существует. В кабеле "${cable.name}" всего ${cable.fiber_count} волокон (0-${cable.fiber_count - 1})` 
      };
    }
    return { valid: true };
  };

  const checkDuplicateSplice = (sourceId, sourceFiber, targetId, targetFiber) => {
    const duplicate = splices.find(s => 
      s.cable_id === sourceId && 
      s.fiber_number === sourceFiber &&
      s.splice_to_cable_id === targetId &&
      s.splice_to_fiber === targetFiber
    );
    return !!duplicate;
  };

  // Проверка используется ли волокно в другом соединении
  const checkFiberInUse = (cableId, fiberNumber) => {
    const existingSplice = splices.find(s =>
      s.cable_id === cableId && s.fiber_number === fiberNumber
    );
    return existingSplice;
  };

  // Проверка связаны ли два кабеля между собой
  const areCablesConnected = (cableId1, cableId2) => {
    const cable1 = cables.find(c => c.id === cableId1);
    const cable2 = cables.find(c => c.id === cableId2);
    
    if (!cable1 || !cable2) return false;
    
    // Кабель 1 заканчивается там где начинается кабель 2
    if (cable1.to_object_id === cable2.from_object_id) return true;
    
    // Кабель 2 заканчивается там где начинается кабель 1
    if (cable2.to_object_id === cable1.from_object_id) return true;
    
    // Оба кабеля заканчиваются в одной точке
    if (cable1.to_object_id === cable2.to_object_id) return true;
    
    // Оба кабеля начинаются в одной точке
    if (cable1.from_object_id === cable2.from_object_id) return true;
    
    return false;
  };

  // Обработка начала перетаскивания волокна
  const handleFiberDragStart = (e, cableId, fiberNumber) => {
    dragStateRef.current = {
      sourceCableId: cableId,
      sourceFiber: fiberNumber
    };
    e.dataTransfer.effectAllowed = 'link';
    e.dataTransfer.setData('text/plain', JSON.stringify(dragStateRef.current));
    console.log('Drag start:', cableId, fiberNumber);
  };

  // Обработка завершения перетаскивания
  const handleFiberDragEnd = async (e, targetCableId, targetFiber) => {
    e.preventDefault();
    console.log('Drag end:', targetCableId, targetFiber);
    
    if (!dragStateRef.current) {
      dragStateRef.current = null;
      return;
    }

    const { sourceCableId, sourceFiber } = dragStateRef.current;

    // Нельзя соединить волокно с самим собой
    if (sourceCableId === targetCableId && sourceFiber === targetFiber) {
      setToast({ message: 'Нельзя соединить волокно с самим собой', type: 'error' });
      dragStateRef.current = null;
      return;
    }

    // Проверяем связаны ли кабели между собой
    if (!areCablesConnected(sourceCableId, targetCableId)) {
      setToast({ 
        message: '❌ Эти кабели не связаны между собой на карте. Соедините их сначала, а потом создавайте соединения волокон.', 
        type: 'error' 
      });
      dragStateRef.current = null;
      return;
    }

    // Проверяем валидность волокон
    const sourceValidation = validateFiber(sourceFiber, sourceCableId);
    if (!sourceValidation.valid) {
      setToast({ message: sourceValidation.message, type: 'error' });
      dragStateRef.current = null;
      return;
    }

    const targetValidation = validateFiber(targetFiber, targetCableId);
    if (!targetValidation.valid) {
      setToast({ message: targetValidation.message, type: 'error' });
      dragStateRef.current = null;
      return;
    }

    // Проверяем дубликаты
    if (checkDuplicateSplice(sourceCableId, sourceFiber, targetCableId, targetFiber)) {
      const targetCable = cables.find(c => c.id === targetCableId);
      setToast({ 
        message: `⚠️ Это соединение уже существует: Волокно ${sourceFiber} → ${targetCable?.name} Волокно ${targetFiber}`, 
        type: 'error' 
      });
      dragStateRef.current = null;
      return;
    }

    // Проверяем использование волокна
    if (checkFiberInUse(sourceCableId, sourceFiber)) {
      setToast({ 
        message: `⚠️ Волокно ${sourceFiber} уже используется в другом соединении. Одно волокно может быть только в одном соединении!`, 
        type: 'error' 
      });
      dragStateRef.current = null;
      return;
    }

    // Создаём соединение
    try {
      const response = await authService.authenticatedFetch('http://localhost:8000/api/fiber-splices/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cable_id: sourceCableId,
          fiber_number: sourceFiber,
          splice_to_cable_id: targetCableId,
          splice_to_fiber: targetFiber,
          notes: null
        })
      });

      if (response.ok) {
        setToast({ message: '✓ Соединение создано перетаскиванием', type: 'success' });
        fetchSplices(selectedCable.id);
      } else {
        const error = await response.json();
        setToast({ message: `Ошибка: ${error.detail || 'Не удалось создать соединение'}`, type: 'error' });
      }
    } catch (error) {
      console.error('Error creating splice:', error);
      setToast({ message: 'Ошибка соединения с сервером', type: 'error' });
    }

    dragStateRef.current = null;
  };

  // Функция для click-based соединения волокон на мобилях
  const handleFiberClick = async (cableId, fiberNumber) => {
    if (!selectedFiber) {
      // Выбираем первое волокно
      setSelectedFiber({ cableId, fiberNumber });
      setToast({ message: `Выбрано волокно F${fiberNumber}. Нажмите на второе волокно для соединения.`, type: 'info' });
      return;
    }

    // Если кликнули на то же волокно отменяем выбор
    if (selectedFiber.cableId === cableId && selectedFiber.fiberNumber === fiberNumber) {
      setSelectedFiber(null);
      setToast({ message: 'Выбор отменён', type: 'info' });
      return;
    }

    // Проверка: нельзя соединять волокна из одного кабеля
    if (selectedFiber.cableId === cableId) {
      setToast({ message: '❌ Нельзя соединять волокна из одного и того же кабеля', type: 'error' });
      setSelectedFiber(null);
      return;
    }

    // Создаём соединение между двумя волокнами
    try {
      const response = await authService.authenticatedFetch('http://localhost:8000/api/fiber-splices/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cable_id: selectedFiber.cableId,
          fiber_number: selectedFiber.fiberNumber,
          splice_to_cable_id: cableId,
          splice_to_fiber: fiberNumber,
          notes: null
        })
      });

      if (response.ok) {
        setToast({ message: `✓ Соединение создано: F${selectedFiber.fiberNumber} ↔ F${fiberNumber}`, type: 'success' });
        setSelectedFiber(null);
        fetchSplices(selectedCable.id);
      } else {
        const error = await response.json();
        setToast({ message: `Ошибка: ${error.detail || 'Не удалось создать соединение'}`, type: 'error' });
        setSelectedFiber(null);
      }
    } catch (error) {
      console.error('Error creating splice:', error);
      setToast({ message: 'Ошибка соединения с сервером', type: 'error' });
      setSelectedFiber(null);
    }
  };

  const handleAddSplice = async (e) => {
    e.preventDefault();
    
    // Базовая валидация
    if (!selectedCable || !spliceForm.to_cable_id) {
      setToast({ message: 'Выберите оба кабеля', type: 'error' });
      return;
    }

    // Проверяем связаны ли кабели между собой
    if (!areCablesConnected(selectedCable.id, parseInt(spliceForm.to_cable_id))) {
      setToast({ 
        message: '❌ Эти кабели не связаны между собой на карте. Соедините их сначала, а потом создавайте соединения волокон.', 
        type: 'error' 
      });
      return;
    }

    // Валидация исходного волокна
    const sourceValidation = validateFiber(spliceForm.from_fiber, selectedCable.id);
    if (!sourceValidation.valid) {
      setToast({ message: sourceValidation.message, type: 'error' });
      return;
    }

    // Валидация целевого волокна
    const targetValidation = validateFiber(spliceForm.to_fiber, parseInt(spliceForm.to_cable_id));
    if (!targetValidation.valid) {
      setToast({ message: targetValidation.message, type: 'error' });
      return;
    }

    // Проверка дублирующихся соединений
    if (checkDuplicateSplice(
      selectedCable.id, 
      spliceForm.from_fiber, 
      parseInt(spliceForm.to_cable_id), 
      spliceForm.to_fiber
    )) {
      const targetCable = cables.find(c => c.id === parseInt(spliceForm.to_cable_id));
      setToast({ 
        message: `⚠️ Это соединение уже существует: Волокно ${spliceForm.from_fiber} → ${targetCable?.name} Волокно ${spliceForm.to_fiber}`, 
        type: 'error' 
      });
      return;
    }

    // Проверка используется ли исходное волокно в другом соединении
    const usedInSource = checkFiberInUse(selectedCable.id, spliceForm.from_fiber);
    if (usedInSource) {
      setToast({ 
        message: `⚠️ Волокно ${spliceForm.from_fiber} уже используется в другом соединении. Одно волокно может быть только в одном соединении!`, 
        type: 'error' 
      });
      return;
    }

    try {
      const response = await authService.authenticatedFetch('http://localhost:8000/api/fiber-splices/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cable_id: selectedCable.id,
          fiber_number: spliceForm.from_fiber,
          splice_to_cable_id: parseInt(spliceForm.to_cable_id),
          splice_to_fiber: spliceForm.to_fiber,
          notes: spliceForm.notes || null
        })
      });

      if (response.ok) {
        setToast({ message: '✓ Соединение создано успешно', type: 'success' });
        setSpliceForm({
          from_fiber: 0,
          to_cable_id: '',
          to_fiber: 0,
          notes: ''
        });
        fetchSplices(selectedCable.id);
      } else {
        const error = await response.json();
        setToast({ message: `Ошибка: ${error.detail || 'Не удалось создать соединение'}`, type: 'error' });
      }
    } catch (error) {
      console.error('Error adding splice:', error);
      setToast({ message: 'Ошибка создания соединения', type: 'error' });
    }
  };

  const handleDeleteSplice = (spliceId) => {
    setConfirmDialog({
      isOpen: true,
      title: '🗑️ Подтверждение удаления',
      message: 'Удалить это соединение рассея?',
      onConfirm: async () => {
        try {
          await authService.authenticatedFetch(`http://localhost:8000/api/fiber-splices/${spliceId}`, {
            method: 'DELETE'
          });
          setToast({ message: 'Рассей удалён', type: 'success' });
          fetchSplices(selectedCable.id);
        } catch (error) {
          console.error('Error deleting splice:', error);
          setToast({ message: 'Ошибка удаления рассея', type: 'error' });
        } finally {
          setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null, onCancel: null });
        }
      },
      onCancel: () => {
        setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null, onCancel: null });
      }
    });
  };

  const getCableName = (cableId) => {
    const cable = cables.find(c => c.id === cableId);
    return cable ? cable.name : `Cable ${cableId}`;
  };

  const getToCableName = () => {
    if (!spliceForm.to_cable_id) return 'Select...';
    const cable = cables.find(c => c.id === parseInt(spliceForm.to_cable_id));
    return cable ? cable.name : `Cable ${spliceForm.to_cable_id}`;
  };

  // Функция для получения сообщений об ошибках валидации
  const getValidationMessages = () => {
    const messages = [];

    // Проверка исходного волокна
    const sourceValidation = validateFiber(spliceForm.from_fiber, selectedCable.id);
    if (!sourceValidation.valid) {
      messages.push({ type: 'error', text: sourceValidation.message });
    }

    // Проверка целевого волокна
    if (spliceForm.to_cable_id) {
      const targetValidation = validateFiber(spliceForm.to_fiber, parseInt(spliceForm.to_cable_id));
      if (!targetValidation.valid) {
        messages.push({ type: 'error', text: targetValidation.message });
      }
    }

    // Проверка дублирующихся соединений
    if (spliceForm.to_cable_id && checkDuplicateSplice(
      selectedCable.id, 
      spliceForm.from_fiber, 
      parseInt(spliceForm.to_cable_id), 
      spliceForm.to_fiber
    )) {
      const targetCable = cables.find(c => c.id === parseInt(spliceForm.to_cable_id));
      messages.push({ 
        type: 'warning', 
        text: `⚠️ Это соединение уже существует: Волокно ${spliceForm.from_fiber} → ${targetCable?.name} Волокно ${spliceForm.to_fiber}` 
      });
    }

    // Проверка используется ли волокно в другом соединении
    if (checkFiberInUse(selectedCable.id, spliceForm.from_fiber)) {
      messages.push({ 
        type: 'warning', 
        text: `⚠️ Волокно ${spliceForm.from_fiber} уже используется в другом соединении` 
      });
    }

    return messages;
  };

  return (
    <div className="schema-editor">
      {/* Для ПК всегда отображать панель кабелей слева.*/}
      <div className={`cables-panel ${mobileEditorView ? 'mobile-hidden' : ''}`}>
        <div className="panel-header">
          <h3>🔗 Кабели</h3>
          <span className="cable-count">{searchedCables.filter(c => c.fiber_count).length}</span>
        </div>
        <div className="search-box">
          <input
            type="text"
            placeholder="Поиск по названию или адресу..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="cable-search-input"
          />
        </div>
        <div className="cable-items">
          {searchedCables.filter(c => c.fiber_count).length === 0 ? (
            <div className="empty-state">Нет оптических кабелей. Создайте кабель с волокнами!</div>
          ) : (
            searchedCables.filter(c => c.fiber_count).map((cable) => {
              const spliceCount = splices.filter(s => s.fiber_number !== undefined && cables.some(c => c.id === cable.id)).length;
              return (
                <div 
                  key={cable.id}
                  className={`cable-item ${selectedCable?.id === cable.id ? 'active' : ''}`}
                  onClick={() => handleCableSelect(cable)}
                  title={`${cableTypeNames[cable.cable_type]} · ${cable.fiber_count} волокон`}
                >
                  <div className="cable-icon">🔗</div>
                  <div className="cable-info">
                    <strong>{cable.name}</strong>
                    <small>{cableTypeNames[cable.cable_type]} · {cable.fiber_count}Ф</small>
                  </div>
                  {spliceCount > 0 && (
                    <div className="cable-splice-badge">{spliceCount}</div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {selectedCable && (
        <div className="schema-container">
          <div className="schema-header">
            <div className="schema-header-top">
              {mobileEditorView && (
                <button 
                  className="btn-back-mobile"
                  onClick={() => {
                    setMobileEditorView(false);
                    setSelectedFiber(null);
                  }}
                  title="Вернуться к списку кабелей"
                >
                  ← Назад
                </button>
              )}
              <h2>📊 {selectedCable.name}</h2>
            </div>
            <div className="schema-meta">
              <span className="meta-badge">{cableTypeNames[selectedCable.cable_type]}</span>
              <span className="meta-badge">{selectedCable.fiber_count} волокон</span>
            </div>
          </div>

          <div className="schema-content">
            <div className="fiber-visualization">
              <h3>📌 Интерактивный редактор соединений</h3>
              <small className="viz-hint">Перетаскивайте волокна между кабелями для создания соединений</small>
              
              <div className="interactive-editor">
                <div className="cable-visualization-block">
                  <div className="cable-label">📤 {selectedCable.name}</div>
                  <div className="fiber-list">
                    {Array.from({ length: selectedCable.fiber_count || 1 }).map((_, i) => {
                      const connectedSplice = splices.find(s => s.fiber_number === i);
                      const isUsed = checkFiberInUse(selectedCable.id, i);
                      const targetCableName = connectedSplice ? getCableName(connectedSplice.splice_to_cable_id) : null;
                      const isSelectedFiber = selectedFiber?.cableId === selectedCable.id && selectedFiber?.fiberNumber === i;
                      
                      return (
                        <div 
                          key={i}
                          className={`fiber-item-draggable ${connectedSplice ? 'has-connection' : ''} ${isUsed ? 'in-use' : ''} ${isSelectedFiber ? 'selected-fiber' : ''}`}
                          draggable={!isUsed}
                          onDragStart={(e) => !isUsed && handleFiberDragStart(e, selectedCable.id, i)}
                          onClick={() => {
                            if (connectedSplice) {
                              handleDeleteSplice(connectedSplice.id);
                            } else if (!isUsed) {
                              handleFiberClick(selectedCable.id, i);
                            }
                          }}
                          title={isUsed ? `Подключено к ${targetCableName}, F${connectedSplice?.splice_to_fiber}. Кликните чтобы удалить.` : `Перетащите на волокно или кликните для выбора`}
                          style={{ cursor: connectedSplice ? 'pointer' : isSelectedFiber ? 'cell' : 'grab' }}
                        >
                          <span className="fiber-number">F{i}</span>
                          {connectedSplice && (
                            <span className="splice-indicator">→ {targetCableName?.length > 10 ? targetCableName.substring(0, 8) + '...' : targetCableName} F{connectedSplice.splice_to_fiber}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="target-cables-container">
                  {selectedTargetCable ? (
                    <div className="cable-visualization-block target-cable">
                      <div 
                        className="cable-label cable-label-clickable"
                        onClick={() => setSelectedTargetCable(null)}
                        title="Нажмите для смены кабеля"
                      >
                        📥 {selectedTargetCable.name}
                      </div>
                      <div className="fiber-list">
                        {Array.from({ length: selectedTargetCable.fiber_count || 1 }).map((_, i) => {
                          const isUsed = checkFiberInUse(selectedTargetCable.id, i);
                          const connectingFromSplice = splices.find(s => s.splice_to_cable_id === selectedTargetCable.id && s.splice_to_fiber === i);
                          const fromCableName = connectingFromSplice ? getCableName(connectingFromSplice.cable_id) : null;
                          const isSelectedFiber = selectedFiber?.cableId === selectedTargetCable.id && selectedFiber?.fiberNumber === i;
                          
                          return (
                            <div 
                              key={i}
                              className={`fiber-item-draggable ${connectingFromSplice ? 'has-connection' : ''} ${isUsed ? 'in-use' : ''} ${isSelectedFiber ? 'selected-fiber' : ''}`}
                              draggable={!isUsed}
                              onDragStart={(e) => !isUsed && handleFiberDragStart(e, selectedTargetCable.id, i)}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'link';
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                handleFiberDragEnd(e, selectedTargetCable.id, i);
                              }}
                              onDragEnter={(e) => {
                                e.preventDefault();
                                if (dragStateRef.current) {
                                  e.currentTarget.classList.add('drag-over');
                                }
                              }}
                              onDragLeave={(e) => {
                                e.currentTarget.classList.remove('drag-over');
                              }}
                              onClick={() => {
                                if (connectingFromSplice) {
                                  handleDeleteSplice(connectingFromSplice.id);
                                } else if (!isUsed) {
                                  handleFiberClick(selectedTargetCable.id, i);
                                }
                              }}
                              title={isUsed ? `Подключено из ${fromCableName}, F${connectingFromSplice?.fiber_number}. Кликните чтобы удалить.` : `Перетащите или кликните для выбора`}
                              style={{ cursor: connectingFromSplice ? 'pointer' : isSelectedFiber ? 'cell' : 'grab' }}
                            >
                              <span className="fiber-number">F{i}</span>
                              {connectingFromSplice && (
                                <span className="splice-indicator">← {fromCableName?.length > 10 ? fromCableName.substring(0, 8) + '...' : fromCableName} F{connectingFromSplice.fiber_number}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="cable-visualization-block target-cable-placeholder">
                      <div 
                        className="cable-label cable-label-clickable"
                        onClick={() => setSelectedTargetCable(searchedCables.find(c => c.id !== selectedCable.id && c.fiber_count && areCablesConnected(selectedCable.id, c.id)) || null)}
                        title="Нажмите для выбора кабеля"
                      >
                        📥 Выберите кабель
                      </div>
                      <div className="cable-selector-popup-menu">
                        <div className="cable-selector-title">Доступные кабели:</div>
                        {searchedCables.filter(c => c.id !== selectedCable.id && c.fiber_count && areCablesConnected(selectedCable.id, c.id)).length === 0 ? (
                          <div className="cable-selector-empty">Нет связанных кабелей</div>
                        ) : (
                          searchedCables.filter(c => c.id !== selectedCable.id && c.fiber_count && areCablesConnected(selectedCable.id, c.id)).map((cable) => (
                            <div 
                              key={cable.id}
                              className="cable-selector-item"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTargetCable(cable);
                              }}
                            >
                              {cable.name} ({cable.fiber_count}F)
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="form-section">
              <div className="form-header">
                <h3>➡ Добавить соединения</h3>
                <small className="form-hint">Или используйте интерактивный редактор выше</small>
              </div>
              
              {getValidationMessages().length > 0 && (
                <div className="validation-messages">
                  {getValidationMessages().map((msg, idx) => (
                    <div key={idx} className={`validation-message validation-${msg.type}`}>
                      {msg.text}
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleAddSplice} className="splice-form">
                <div className="form-group-pair">
                  <div className="form-group">
                    <label>Исходный кабель</label>
                    <div className="cable-selector">
                      <span className="cable-name-display">
                        {selectedCable.name}
                      </span>
                      <span className="cable-meta">{selectedCable.fiber_count}F</span>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Номер волокна</label>
                    <select
                      name="from_fiber"
                      value={spliceForm.from_fiber}
                      onChange={handleSpliceFormChange}
                    >
                      {Array.from({ length: selectedCable.fiber_count || 1 }).map((_, i) => (
                        <option key={i} value={i}>Волокно {i}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-divider">
                  <span className="arrow-icon">↓</span>
                </div>

                <div className="form-group-pair">
                  <div className="form-group">
                    <label>К кабелю</label>
                    <select
                      name="to_cable_id"
                      value={spliceForm.to_cable_id}
                      onChange={handleSpliceFormChange}
                      required
                      className="cable-select"
                    >
                      <option value="">Выберите целевой кабель...</option>
                      {cables.filter(c => c.id !== selectedCable.id && c.fiber_count && areCablesConnected(selectedCable.id, c.id)).map(cable => (
                        <option key={cable.id} value={cable.id}>
                          {cable.name} ({cable.fiber_count}F)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>К волокну</label>
                    <select
                      name="to_fiber"
                      value={spliceForm.to_fiber}
                      onChange={handleSpliceFormChange}
                      disabled={!spliceForm.to_cable_id}
                      className={!spliceForm.to_cable_id ? 'disabled' : ''}
                    >
                      <option value="">Выберите волокно...</option>
                      {spliceForm.to_cable_id && Array.from({ 
                        length: cables.find(c => c.id === parseInt(spliceForm.to_cable_id))?.fiber_count || 1 
                      }).map((_, i) => (
                        <option key={i} value={i}>Волокно {i}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Примечания <span className="optional">(необязательно)</span></label>
                  <input
                    type="text"
                    name="notes"
                    value={spliceForm.notes}
                    onChange={handleSpliceFormChange}
                    placeholder="напр., Основной путь, Резервный, и т.д."
                    maxLength={50}
                  />
                  <small className="input-hint">{spliceForm.notes.length}/50 символов</small>
                </div>

                <button 
                  type="submit" 
                  className="btn-primary btn-block"
                >
                  ✓ Создать соединение
                </button>
              </form>
            </div>

            <div className="splices-list">
              <div className="list-header">
                <h3>🔌 Стыковые соединения</h3>
                <span className="splice-count-badge">{splices.length}</span>
              </div>
              {splices.length === 0 ? (
                <div className="empty-state">Пока нет стыковых соединений. Создайте первое соединение выше.</div>
              ) : (
                <div className="splice-items">
                  {splices.map((splice, idx) => (
                    <div key={splice.id} className="splice-item">
                      <div className="splice-number">{idx + 1}</div>
                      <div className="splice-info">
                        <div className="splice-connection">
                          <span className="connection-label">
                            <span className="fiber-badge">F{splice.fiber_number}</span>
                            <span className="connection-arrow">→</span>
                            <span className="cable-badge">{splice.splice_to_cable_id ? getCableName(splice.splice_to_cable_id) : 'N/A'}</span>
                            <span className="fiber-badge">F{splice.splice_to_fiber}</span>
                          </span>
                        </div>
                        {splice.notes && (
                          <small className="splice-notes">📝 {splice.notes}</small>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteSplice(splice.id)}
                        className="btn-delete"
                        title="Удалить стыковые соединения"
                        aria-label="Delete splice"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!selectedCable && (
        <div className="placeholder">
          <p>📋 Выберите кабель, чтобы просмотреть и управлять его схемой волокон</p>
        </div>
      )}


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
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default SchemaEditor;
