import React, { useState, useEffect, useRef } from 'react';
import MapEditor from './components/MapEditor';
import SchemaEditor from './components/SchemaEditor';
import Login from './components/Login';
import Register from './components/Register';
import Toast from './components/Toast';
import RegionFilter from './components/RegionFilter';
import authService from './services/authService';
import './App.css';
import { getLocationName } from './utils/regionUtils';

function App() {
  const [activeTab, setActiveTab] = useState('map');
  const [objects, setObjects] = useState([]);
  const [importDialog, setImportDialog] = useState(false);
  const [toast, setToast] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPage, setCurrentPage] = useState('login');
  const [currentUser, setCurrentUser] = useState(null);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [selectedRegions, setSelectedRegions] = useState([]);
  const [pickingRegionCoordinate, setPickingRegionCoordinate] = useState(false);
  const regionFilterRef = useRef(null);

  useEffect(() => {
    // Проверяем, авторизован ли пользователь
    if (authService.isAuthenticated()) {
      setIsAuthenticated(true);
      setCurrentUser(authService.getUser());
      setCurrentPage('app'); // ← Добавляем это, чтобы показать приложение
      fetchObjects();
    } else {
      setIsAuthenticated(false);
      setCurrentPage('login'); // Показываем login если не авторизован
    }
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setCurrentUser(authService.getUser());
    setCurrentPage('app');
    fetchObjects();
  };

  const handleRegisterSuccess = () => {
    setIsAuthenticated(true);
    setCurrentUser(authService.getUser());
    setCurrentPage('app');
    fetchObjects();
  };

  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setCurrentPage('login');
  };

  const fetchObjects = async () => {
    try {
      const response = await authService.authenticatedFetch('http://localhost:8000/api/network-objects/');
      const data = await response.json();
      setObjects(data);
    } catch (error) {
      console.error('Error fetching objects:', error);
      if (error.message.includes('401') || error.message.includes('Not authenticated')) {
        handleLogout();
      }
    }
  };

  const handleExportFull = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/export/full');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `network_schema_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        setToast({ message: 'Schema exported successfully', type: 'success' });
      }, 500);
    } catch (error) {
      console.error('Error exporting schema:', error);
      setToast({ message: 'Error exporting schema', type: 'error' });
    }
  };

  const handleExportGeoJSON = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/export/geojson');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `network_schema_${new Date().toISOString().split('T')[0]}.geojson`;
      a.click();
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        setToast({ message: 'GeoJSON exported successfully', type: 'success' });
      }, 500);
    } catch (error) {
      console.error('Error exporting GeoJSON:', error);
      setToast({ message: 'Error exporting GeoJSON', type: 'error' });
    }
  };

  const handleImport = async (file) => {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const endpoint = file.name.endsWith('.geojson') 
        ? 'http://localhost:8000/api/import/geojson'
        : 'http://localhost:8000/api/import/schema';

      const accessToken = authService.getAccessToken();
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        const splices = result.imported.splices || 0;
        const objCount = result.imported.objects;
        const cableCount = result.imported.cables;
        const message = splices > 0
          ? `Imported: ${objCount} objects, ${cableCount} cables, ${splices} splices`
          : `Imported: ${objCount} objects, ${cableCount} cables`;
        setToast({ message, type: 'success' });
        // Signal components to refresh data
        localStorage.setItem('refresh_data', Date.now().toString());
        // Reload both objects and trigger full refresh
        setTimeout(() => {
          fetchObjects();
          setImportDialog(false);
        }, 500);
      } else {
        setToast({ message: 'Error importing file', type: 'error' });
      }
    } catch (error) {
      console.error('Error importing schema:', error);
      setToast({ message: 'Error importing file', type: 'error' });
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/export/full');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      let csv = 'Network Objects\n';
      csv += 'ID,Name,Type,Latitude,Longitude\n';
      data.objects.forEach(obj => {
        csv += `${obj.id},"${obj.name}",${obj.object_type},${obj.latitude},${obj.longitude}\n`;
      });
      
      csv += '\n\nCables\n';
      csv += 'ID,Name,Type,From Object,To Object,Fibers,Distance (km)\n';
      data.cables.forEach(cable => {
        const fromObj = data.objects.find(o => o.id === cable.from_object_id);
        const toObj = data.objects.find(o => o.id === cable.to_object_id);
        csv += `${cable.id},"${cable.name}",${cable.cable_type},"${fromObj?.name}","${toObj?.name}",${cable.fiber_count || ''},${cable.distance_km || ''}\n`;
      });
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `network_schema_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        setToast({ message: 'CSV exported successfully', type: 'success' });
      }, 500);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      setToast({ message: 'Error exporting CSV', type: 'error' });
    }
  };

  const handleRegionCoordinatePicked = async (lat, lon) => {
    // Если RegionFilter в режиме выбора - передаём координаты ему
    if (pickingRegionCoordinate && regionFilterRef.current?.handleMapCoordinate) {
      regionFilterRef.current.handleMapCoordinate(lat, lon);
      setPickingRegionCoordinate(false);
      return;
    }

    try {
      // Определяем город по координатам
      const locationInfo = await getLocationName(lat, lon);
      
      if (locationInfo) {
        setToast({ 
          message: `✓ Добавлен регион: ${locationInfo.name}`, 
          type: 'success' 
        });
      } else {
        setToast({ 
          message: 'Не удалось определить город по этим координатам', 
          type: 'error' 
        });
      }
    } catch (error) {
      console.error('Error picking region coordinate:', error);
      setToast({ 
        message: 'Ошибка при определении города', 
        type: 'error' 
      });
    }
    
    setPickingRegionCoordinate(false);
  };

  const handleRegionDataLoaded = (data) => {
    if (data.region) {
      setToast({
        message: `Загружено ${data.objects.length} объектов и ${data.cables.length} кабелей из ${data.cityName}`,
        type: 'success'
      });
      console.log('Region data loaded:', data);
    }
  };

  // Если не авторизован, показываем экран входа/регистрации
  if (!isAuthenticated || currentPage === 'login' || currentPage === 'register') {
    return (
      <div>
        {currentPage === 'register' ? (
          <Register onRegisterSuccess={handleRegisterSuccess} onSwitchPage={setCurrentPage} />
        ) : (
          <Login onLoginSuccess={handleLoginSuccess} onSwitchPage={setCurrentPage} />
        )}
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <h1>FiberWeaver</h1>
        <nav className="tabs">
          <button 
            className={`tab ${activeTab === 'map' ? 'active' : ''}`}
            onClick={() => setActiveTab('map')}
          >
            Эдитор карты
          </button>
          <button 
            className={`tab ${activeTab === 'schema' ? 'active' : ''}`}
            onClick={() => setActiveTab('schema')}
          >
            Схемы волокон
          </button>
        </nav>
        
        <div className="header-center">
          <RegionFilter 
            ref={regionFilterRef}
            selectedRegions={selectedRegions}
            onRegionsChange={setSelectedRegions}
            onPickCoordinate={() => setPickingRegionCoordinate(true)}
            onDataLoaded={handleRegionDataLoaded}
          />
        </div>
        
        <div className="header-actions">
          <div className="user-menu">
            <span className="user-name">👤 {currentUser?.username}</span>
            <button 
              className="btn-header btn-logout"
              onClick={handleLogout}
            >
              🚠 Выход
            </button>
          </div>

          <div className="export-menu">
            <button className="btn-header">📥 Экспорт</button>
            <div className="export-dropdown">
              <button onClick={handleExportFull}>📄 Полная схема (JSON)</button>
              <button onClick={handleExportGeoJSON}>🗺️ GeoJSON Карта</button>
              <button onClick={handleExportCSV}>📊 CSV Таблица</button>
            </div>
          </div>
          
          <button 
            className="btn-header"
            onClick={() => setImportDialog(true)}
          >
            📤 Импорт
          </button>

          <button
            type="button"
            className="sidebar-toggle-header"
            onClick={() => setSidebarVisible(!sidebarVisible)}
            title="Show/hide panel"
            aria-label="Toggle sidebar"
          >
            ☰
          </button>
        </div>
      </header>

      {importDialog && (
        <div className="import-modal-overlay" onClick={() => setImportDialog(false)}>
          <div className="import-modal" onClick={(e) => e.stopPropagation()}>
            <h2>📤 Импорт схемы</h2>
            <div className="import-drop-zone">
              <input
                type="file"
                accept=".json,.geojson"
                onChange={(e) => {
                  if (e.target.files[0]) {
                    handleImport(e.target.files[0]);
                  }
                }}
                style={{ display: 'none' }}
                id="import-file"
              />
              <label htmlFor="import-file" className="drop-zone-label">
                <p>📁 Click to select file or drag and drop</p>
                <small>Supported: JSON schema, GeoJSON map files</small>
              </label>
            </div>
            <button 
              className="btn-secondary"
              onClick={() => setImportDialog(false)}
              style={{ width: '100%', marginTop: '16px' }}
            >
              ✕ Cancel
            </button>
          </div>
        </div>
      )}

      <main className="main-content">
        {activeTab === 'map' && (
          <MapEditor 
            objects={objects} 
            onObjectsChange={fetchObjects} 
            sidebarVisible={sidebarVisible} 
            setSidebarVisible={setSidebarVisible}
            selectedRegions={selectedRegions}
            pickingRegionCoordinate={pickingRegionCoordinate}
            onRegionCoordinatePicked={(lat, lon) => {
              // Логика определения города по координатам
              handleRegionCoordinatePicked(lat, lon);
            }}
          />
        )}
        {activeTab === 'schema' && <SchemaEditor selectedRegions={selectedRegions} objects={objects} />}
      </main>

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
export default App;
