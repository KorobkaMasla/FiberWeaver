import { VALIDATION_RULES, MAX_NAME_LENGTH, MAX_DESCRIPTION_LENGTH } from '../constants/index.js';

export const validators = {
  isValidName: (name) => {
    if (!name || typeof name !== 'string') return false;
    if (name.length < 1 || name.length > MAX_NAME_LENGTH) return false;
    return true;
  },

  isValidCoordinates: (lat, lon) => {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
  },

  isValidFiberCount: (count) => {
    const num = parseInt(count);
    return !isNaN(num) && num >= 1 && num <= 1000;
  },

  isValidDistance: (distance) => {
    if (!distance) return true; 
    const dist = parseFloat(distance);
    return !isNaN(dist) && dist >= 0;
  },

  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  isValidPassword: (password) => {
    return password && password.length >= 6;
  },

  isValidFile: (file, maxSizeMB = 100) => {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file && file.size <= maxSizeBytes;
  },

  isValidFileFormat: (file, allowedFormats) => {
    if (!file) return false;
    const extension = file.name.split('.').pop().toLowerCase();
    return allowedFormats.includes(extension);
  },
};

export const formatters = {
  formatCoordinates: (lat, lon) => {
    const latStr = Math.abs(lat).toFixed(6) + (lat >= 0 ? '° N' : '° S');
    const lonStr = Math.abs(lon).toFixed(6) + (lon >= 0 ? '° E' : '° W');
    return `${latStr}, ${lonStr}`;
  },

  formatDistance: (distance) => {
    if (!distance) return '—';
    if (distance < 1) return (distance * 1000).toFixed(0) + ' м';
    return distance.toFixed(2) + ' км';
  },

  formatDate: (date) => {
    if (!date) return '—';
    const d = new Date(date);
    return d.toLocaleDateString('uk-UA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  },

  formatFileSize: (bytes) => {
    if (bytes === 0) return '0 Б';
    const k = 1024;
    const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  truncateString: (str, maxLength) => {
    if (!str || str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '...';
  },

  capitalize: (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  formatNumber: (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  },

  formatCamelCase: (str) => {
    return str
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  },
};

export const validateObjectForm = (data) => {
  const errors = {};

  if (!validators.isValidName(data.name)) {
    errors.name = 'Invalid name';
  }

  if (!validators.isValidCoordinates(data.latitude, data.longitude)) {
    errors.coordinates = 'Invalid coordinates';
  }

  return Object.keys(errors).length === 0 ? null : errors;
};

export const validateCableForm = (data) => {
  const errors = {};

  if (!validators.isValidName(data.name)) {
    errors.name = 'Invalid name';
  }

  if (!data.cable_type) {
    errors.cable_type = 'Cable type is required';
  }

  if (!validators.isValidDistance(data.distance_km)) {
    errors.distance_km = 'Invalid distance';
  }

  if (data.cable_type === 'optical' && !validators.isValidFiberCount(data.fiber_count)) {
    errors.fiber_count = 'Invalid fiber count';
  }

  return Object.keys(errors).length === 0 ? null : errors;
};

export const validateSpliceForm = (data) => {
  const errors = {};

  if (!Number.isInteger(data.from_fiber) || data.from_fiber < 0) {
    errors.from_fiber = 'Invalid fiber number';
  }

  if (!data.to_cable_id) {
    errors.to_cable_id = 'Target cable is required';
  }

  if (!Number.isInteger(data.to_fiber) || data.to_fiber < 0) {
    errors.to_fiber = 'Invalid fiber number';
  }

  return Object.keys(errors).length === 0 ? null : errors;
};
