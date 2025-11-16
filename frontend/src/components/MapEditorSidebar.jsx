import React, { useState, useEffect } from 'react';
import './MapEditor.css';
import SearchFilterMenu from './SearchFilterMenu';

/**
 * MapEditorSidebar - компонент боковой панели с табами, формами и списками
 * Управляет высотой формы через resizer
 */
function MapEditorSidebar({
  activeTab,
  setActiveTab,
  sidebarVisible,
  setSidebarVisible,
  formHeight,
  setFormHeight,
  isResizing,
  setIsResizing,
  isMobile,
  // Objects tab content
  objectsForm,
  onObjectsFormChange,
  onObjectSubmit,
  onObjectCancel,
  isEditingObject,
  isLoadingObject,
  pickingCoordinates,
  onPickingCoordinatesToggle,
  objectsList,
  onEditObject,
  onDeleteObject,
  objectsSearchTerm,
  setObjectsSearchTerm,
  objectsQuickFilters,
  setObjectsQuickFilters,
  addressLoading,
  // Cables tab content
  cablesForm,
  onCablesFormChange,
  onCablesSubmit,
  onCablesCancel,
  isEditingCable,
  isLoadingCable,
  cablesList,
  onEditCable,
  onDeleteCable,
  cablesSearchTerm,
  setCablesSearchTerm,
  cablesQuickFilters,
  setCablesQuickFilters,
  // UI data
  objectTypes = [],
  cableTypes = [],
  objectTypeEmojis,
  objectTypeNames,
  getCableColor,
  objects // для заполнения селектов в кабелях
}) {
  // Логика управления высотой формы через resizer
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      e.preventDefault();

      const sidebar = document.querySelector('.sidebar');
      const tabs = document.querySelector('.sidebar-tabs');
      const resizer = document.querySelector('.sidebar-resizer');
      if (!sidebar || !tabs || !resizer) return;

      const sidebarRect = sidebar.getBoundingClientRect();
      const tabsRect = tabs.getBoundingClientRect();
      const resizerRect = resizer.getBoundingClientRect();

      const tabsBottom = tabsRect.bottom;
      const sidebarTop = sidebarRect.top;
      const sidebarHeight = sidebarRect.height;
      const tabsHeight = tabsRect.height;
      const resizerHeight = resizerRect.height || 14; // padding + grip

      // Минимальная высота формы, чтобы элементы не ломались
      const minFormHeight = 120;
      // Минимальный резерв для списка (заголовок + несколько строк + прокрутка)
      const minListReserve = 140;

      // Желаемая высота формы от нижней границы табов до текущей позиции курсора
      const rawHeight = e.clientY - tabsBottom;
      const clampedHeight = Math.max(minFormHeight, rawHeight);

      // Максимально возможная высота формы с учётом резерва и ресайзера
      const maxFormHeight = sidebarHeight - tabsHeight - resizerHeight - minListReserve;

      const finalHeight = Math.min(clampedHeight, maxFormHeight);
      setFormHeight(finalHeight);
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
  }, [isResizing, setFormHeight, setIsResizing]);

  // Корректируем высоту при изменении размеров окна (чтобы не выходило за пределы)
  useEffect(() => {
    const syncHeightOnResize = () => {
      const sidebar = document.querySelector('.sidebar');
      const tabs = document.querySelector('.sidebar-tabs');
      const resizer = document.querySelector('.sidebar-resizer');
      if (!sidebar || !tabs || !resizer) return;
      const sidebarRect = sidebar.getBoundingClientRect();
      const tabsRect = tabs.getBoundingClientRect();
      const resizerRect = resizer.getBoundingClientRect();
      const tabsHeight = tabsRect.height;
      const resizerHeight = resizerRect.height || 14;
      const minListReserve = 140;
      const maxFormHeight = sidebarRect.height - tabsHeight - resizerHeight - minListReserve;
      if (formHeight > maxFormHeight) {
        setFormHeight(Math.max(120, maxFormHeight));
      }
    };
    window.addEventListener('resize', syncHeightOnResize);
    syncHeightOnResize();
    return () => window.removeEventListener('resize', syncHeightOnResize);
  }, [formHeight, setFormHeight]);

  return (
    <aside className={`sidebar ${!isMobile || sidebarVisible ? 'visible' : ''}`}>
      {/* Close button for mobile/tablet */}
      <button
        type="button"
        className="sidebar-close-btn"
        onClick={() => setSidebarVisible(false)}
        title="Hide panel"
        aria-label="Close sidebar"
      >
        ✕
      </button>
      
      {/* Tabs */}
      <div className="sidebar-tabs">
        <button 
          className={`sidebar-tab ${activeTab === 'objects' ? 'active' : ''}`}
          onClick={() => setActiveTab('objects')}
        >
          Объекты
        </button>
        <button 
          className={`sidebar-tab ${activeTab === 'cables' ? 'active' : ''}`}
          onClick={() => setActiveTab('cables')}
        >
          Кабели
        </button>
      </div>

      {/* Objects Tab */}
      {activeTab === 'objects' && (
        <>
          {/* Form Section */}
          <div className="sidebar-form-section" style={{ height: `${formHeight}px` }}>
            <div className="sidebar-header">
              <h3>{isEditingObject ? 'Редактировать объект' : 'Новый объект'}</h3>
            </div>

            <form onSubmit={onObjectSubmit} className="add-form">
              <div className="form-group">
                <label>Имя объекта</label>
                <input
                  type="text"
                  name="name"
                  value={objectsForm.name}
                  onChange={onObjectsFormChange}
                  placeholder="Введите имя..."
                  required
                />
              </div>

              <div className="form-group">
                <label>Тип</label>
                <select 
                  name="object_type_id" 
                  value={objectsForm.object_type_id || 1}
                  onChange={onObjectsFormChange}
                >
                  {objectTypes.map(type => (
                    <option key={type.object_type_id} value={type.object_type_id}>
                      {type.emoji} {type.display_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Широта</label>
                <input
                  type="number"
                  name="latitude"
                  value={objectsForm.latitude}
                  onChange={onObjectsFormChange}
                  step="0.0001"
                  required
                />
              </div>

              <div className="form-group">
                <label>Долгота</label>
                <input
                  type="number"
                  name="longitude"
                  value={objectsForm.longitude}
                  onChange={onObjectsFormChange}
                  step="0.0001"
                  required
                />
              </div>

              <div className="form-group">
                <label>Адрес</label>
                <div className="address-input-wrapper">
                  <input
                    type="text"
                    name="address"
                    value={objectsForm.address || ''}
                    onChange={onObjectsFormChange}
                    placeholder="Адрес будет заполнен автоматически при выборе координат"
                    readOnly
                  />
                  {addressLoading && (
                    <div className="address-loading-indicator">
                      <span className="loading-spinner">⟳</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="form-buttons">
                <button type="submit" disabled={isLoadingObject || !objectsForm.address || !objectsForm.address.trim()} className="btn-primary">
                  {isLoadingObject ? '⏳' : isEditingObject ? '✓' : '✚'} {isEditingObject ? 'Обновить' : 'Добавить'}
                </button>
                <button
                  type="button"
                  onClick={onPickingCoordinatesToggle}
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
                {isEditingObject && (
                  <button 
                    type="button" 
                    onClick={onObjectCancel}
                    className="btn-secondary"
                  >
                    ✕ Отмена
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Resizer */}
          <div 
            className="sidebar-resizer"
            onMouseDown={() => setIsResizing(true)}
          />

          {/* Лист объектов*/}
          <div className="objects-list">
            <h3>Объекты ({objectsList.length})</h3>
            <div className="search-filter-row">
              <input
                type="text"
                placeholder="🔍 Поиск объектов..."
                value={objectsSearchTerm}
                onChange={(e) => setObjectsSearchTerm(e.target.value)}
                className="list-search-input"
              />
              <SearchFilterMenu
                type="objects"
                objectTypes={objectTypes}
                objectTypeEmojis={objectTypeEmojis}
                objectTypeNames={objectTypeNames}
                selectedFilters={objectsQuickFilters}
                onFilterChange={setObjectsQuickFilters}
              />
            </div>
            <div className="objects-scroll">
              {objectsList
                .filter(obj => {
                  // Search filter - search by name, type, and address
                  const matchesSearch = 
                    obj.name.toLowerCase().includes(objectsSearchTerm.toLowerCase()) ||
                    objectTypeNames[obj.object_type]?.toLowerCase().includes(objectsSearchTerm.toLowerCase()) ||
                    (obj.address && obj.address.toLowerCase().includes(objectsSearchTerm.toLowerCase()));
                  
                  // Quick filter - if no quick filters selected, show all; otherwise only show selected types
                  const matchesQuickFilter = objectsQuickFilters.size === 0 || objectsQuickFilters.has(obj.object_type);
                  
                  return matchesSearch && matchesQuickFilter;
                })
                .map(obj => {
                const isActive = isEditingObject && (
                  objectsForm.id === obj.id || 
                  String(objectsForm.id) === String(obj.id)
                );
                return (
                  <div key={obj.id} className={`object-item ${isActive ? 'active' : ''}`}>
                    <span className="object-type">{objectTypeEmojis[obj.object_type]}</span>
                    <div className="object-info">
                      <strong>{obj.display_name || obj.name}</strong>
                      <small>{objectTypeNames[obj.object_type]}</small>
                    </div>
                    <div className="item-actions" style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => onEditObject(obj)}
                        className="btn-icon"
                        title="Edit"
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => onDeleteObject(obj.id)}
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

      {/* Cables Tab */}
      {activeTab === 'cables' && (
        <>
          {/* Form Section */}
          <div className="sidebar-form-section" style={{ height: `${formHeight}px` }}>
            <div className="sidebar-header">
              <h3>{isEditingCable ? 'Редактировать кабель' : 'Новый кабель'}</h3>
            </div>

            <form onSubmit={onCablesSubmit} className="add-form">
              <div className="form-group">
                <label>Имя кабеля</label>
                <input
                  type="text"
                  name="name"
                  value={cablesForm.name}
                  onChange={onCablesFormChange}
                  placeholder="Основная линия A"
                  required
                />
              </div>

              <div className="form-group">
                <label>Тип кабеля</label>
                <select 
                  name="cable_type" 
                  value={cablesForm.cable_type || 'optical'}
                  onChange={onCablesFormChange}
                >
                  <option value="optical">🟦 Оптический</option>
                  <option value="copper">🟨 Медный</option>
                </select>
              </div>

              {cablesForm.cable_type === 'optical' && (
                <div className="form-group">
                  <label>Количество волокон</label>
                  <input
                    type="number"
                    name="fiber_count"
                    value={cablesForm.fiber_count || ''}
                    onChange={onCablesFormChange}
                    min="1"
                    max="288"
                    placeholder="Введите количество волокон"
                    required
                  />
                  <small>Тип кабеля определяется автоматически по БД</small>
                </div>
              )}

              <div className="form-row-pair">
                <div className="form-group">
                  <label>Начало</label>
                  <select 
                    name="from_object_id" 
                    value={cablesForm.from_object_id}
                    onChange={onCablesFormChange}
                    required
                  >
                    <option value="">Выбрать...</option>
                    {objects.map(obj => (
                      <option key={obj.id} value={obj.id}>
                        {objectTypeEmojis[obj.object_type]} {obj.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Конец</label>
                  <select 
                    name="to_object_id" 
                    value={cablesForm.to_object_id}
                    onChange={onCablesFormChange}
                    required
                  >
                    <option value="">Выбрать...</option>
                    {objects.map(obj => (
                      <option key={obj.id} value={obj.id}>
                        {objectTypeEmojis[obj.object_type]} {obj.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <div className="distance-label-row">
                  <label>Расстояние (км)</label>
                  {cablesForm.from_object_id && cablesForm.to_object_id && cablesForm.distance_km && (
                    <small className="auto-filled-indicator">✓ Авто-расчёт</small>
                  )}
                </div>
                <input
                  type="number"
                  name="distance_km"
                  value={cablesForm.distance_km}
                  onChange={onCablesFormChange}
                  step="0.1"
                  placeholder="0.0"
                  className={cablesForm.from_object_id && cablesForm.to_object_id && cablesForm.distance_km ? 'auto-filled' : ''}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" disabled={isLoadingCable} className="btn-primary" style={{ flex: 1 }}>
                  {isLoadingCable ? '⏳' : isEditingCable ? '✓' : '✚'} {isEditingCable ? 'Обновить' : 'Добавить'}
                </button>
                {isEditingCable && (
                  <button 
                    type="button" 
                    onClick={onCablesCancel}
                    className="btn-secondary"
                    style={{ flex: 1 }}
                  >
                    ✕ Отмена
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Resizer */}
          <div 
            className="sidebar-resizer"
            onMouseDown={() => setIsResizing(true)}
          />

          {/* Cables List */}
          <div className="cables-list">
            <h3>Кабели ({cablesList.length})</h3>
            <div className="search-filter-row">
              <input
                type="text"
                placeholder="🔍 Поиск кабелей..."
                value={cablesSearchTerm}
                onChange={(e) => setCablesSearchTerm(e.target.value)}
                className="list-search-input"
              />
              <SearchFilterMenu
                type="cables"
                cableTypes={cableTypes}
                selectedFilters={cablesQuickFilters}
                onFilterChange={setCablesQuickFilters}
              />
            </div>
            <div className="cables-scroll">
              {cablesList
                .filter(cable => {
                  const fromObj = objects.find(o => o.id === cable.from_object_id);
                  const toObj = objects.find(o => o.id === cable.to_object_id);
                  const searchLower = cablesSearchTerm.toLowerCase();
                  
                  // Search filter
                  const matchesSearch = (
                    cable.name.toLowerCase().includes(searchLower) ||
                    fromObj?.name.toLowerCase().includes(searchLower) ||
                    toObj?.name.toLowerCase().includes(searchLower) ||
                    (cable.cable_type_name || '').toLowerCase().includes(searchLower)
                  );
                  
                  // Quick filter - if no quick filters selected, show all; otherwise only show selected types
                  const matchesQuickFilter = cablesQuickFilters.size === 0 || cablesQuickFilters.has(cable.cable_type_name);
                  
                  return matchesSearch && matchesQuickFilter;
                })
                .map(cable => {
                const fromObj = objects.find(o => o.id === cable.from_object_id);
                const toObj = objects.find(o => o.id === cable.to_object_id);
                return (
                  <div 
                    key={cable.id} 
                    className={`cable-item ${isEditingCable && cablesForm.id === cable.id ? 'active' : ''}`}
                  >
                    <div className="cable-color" style={{ backgroundColor: cable.cable_type_color || '#3b82f6' }}></div>
                    <div className="cable-info">
                      <strong>{cable.name}</strong>
                      <small>{fromObj?.name} → {toObj?.name}</small>
                    </div>
                    <div className="cable-type-badge">
                      <span className="cable-tiny">{cable.cable_type_name || 'Синий'}{cable.fiber_count ? ` • ${cable.fiber_count}` : ''}</span>
                    </div>
                    <div className="item-actions" style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => onEditCable(cable)}
                        className="btn-icon"
                        title="Edit"
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => onDeleteCable(cable.id)}
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
  );
}

export default MapEditorSidebar;
