
export const API_BASE_URL = 'http://localhost:8000';
export const API_PREFIX = '/api';
export const API_ENDPOINTS = {
  AUTH_LOGIN: `${API_PREFIX}/auth/login`,
  AUTH_REGISTER: `${API_PREFIX}/auth/register`,
  
  NETWORK_OBJECTS: `${API_PREFIX}/network-objects`,
  NETWORK_OBJECTS_LIST: `${API_PREFIX}/network-objects/`,
  
  CABLES: `${API_PREFIX}/cables`,
  CABLES_LIST: `${API_PREFIX}/cables/`,
  
  FIBER_SPLICES: `${API_PREFIX}/fiber-splices`,
  FIBER_SPLICES_LIST: `${API_PREFIX}/fiber-splices/`,
  
  EXPORT_FULL: `${API_PREFIX}/export/full`,
  EXPORT_GEOJSON: `${API_PREFIX}/export/geojson`,
  
  IMPORT_SCHEMA: `${API_PREFIX}/import/schema`,
  IMPORT_GEOJSON: `${API_PREFIX}/import/geojson`,
};

export const CABLE_TYPES = {
  OPTICAL: 'optical',
  COPPER: 'copper',
};

export const CABLE_TYPE_NAMES = {
  optical: 'Оптический',
  copper: 'Медный',
};

export const CABLE_TYPE_COLORS = {
  optical: '#FF6B35',
  copper: '#004E89',
};

export const OBJECT_TYPES = {
  NODE: 'node',
  MUFA: 'mufa',
  CABINET: 'cabinet',
  SPLITTER: 'splitter',
  SUBSCRIBER: 'subscriber',
  POLE: 'pole',
  WELL: 'well',
  CAMERA: 'camera',
  WIFI: 'wifi',
};

export const OBJECT_TYPE_NAMES = {
  node: 'Узел',
  mufa: 'Муфа',
  cabinet: 'Шкаф',
  splitter: 'Сплиттер',
  subscriber: 'Абонент',
  pole: 'Опора',
  well: 'Скважина',
  camera: 'Камера',
  wifi: 'WiFi',
};

export const OBJECT_TYPE_ICONS = {
  node: '🔵',
  mufa: '📦',
  cabinet: '🗄️',
  splitter: '🔀',
  subscriber: '📞',
  pole: '📏',
  well: '🕳️',
  camera: '📹',
  wifi: '📡',
};

export const MAP_CENTER = [49.2, 28.5]; 
export const MAP_ZOOM = 10;
export const MAP_MIN_ZOOM = 2;
export const MAP_MAX_ZOOM = 19;

export const TOAST_DURATION = 3000;
export const TOAST_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  INFO: 'info',
  WARNING: 'warning',
};

export const MIN_NAME_LENGTH = 1;
export const MAX_NAME_LENGTH = 255;
export const MAX_DESCRIPTION_LENGTH = 1000;
export const MIN_FIBER_COUNT = 1;
export const MAX_FIBER_COUNT = 1000;

export const VALIDATION_RULES = {
  NAME: {
    required: true,
    minLength: MIN_NAME_LENGTH,
    maxLength: MAX_NAME_LENGTH,
    pattern: /^[\w\-\s]+$/,
  },
  FIBER_COUNT: {
    required: true,
    min: MIN_FIBER_COUNT,
    max: MAX_FIBER_COUNT,
  },
};

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  REFRESH_DATA: 'refresh_data',
  USER_INFO: 'user_info',
};

export const KEYBOARD_SHORTCUTS = {
  M: 'Toggle Measurement Mode',
  S: 'Toggle Select Mode',
  D: 'Toggle Draw Mode',
  Delete: 'Delete Selected Item',
  Escape: 'Cancel Current Operation',
};
