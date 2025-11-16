// Frontend API Utilities

import { API_ENDPOINTS, API_BASE_URL } from '../constants/index.js';
import authService from '../services/authService.js';

class APIClient {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add authorization token if available
    const token = authService.getAccessToken();
    if (token && !endpoint.includes('/auth/')) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'API request failed');
      }

      return response;
    } catch (error) {
      console.error(`API Error: ${endpoint}`, error);
      throw error;
    }
  }

  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // Network Objects
  async getNetworkObjects() {
    const response = await this.get(API_ENDPOINTS.NETWORK_OBJECTS_LIST);
    return response.json();
  }

  async createNetworkObject(data) {
    const response = await this.post(API_ENDPOINTS.NETWORK_OBJECTS_LIST, data);
    return response.json();
  }

  async updateNetworkObject(id, data) {
    const response = await this.put(`${API_ENDPOINTS.NETWORK_OBJECTS}/${id}`, data);
    return response.json();
  }

  async deleteNetworkObject(id) {
    return this.delete(`${API_ENDPOINTS.NETWORK_OBJECTS}/${id}`);
  }

  // Cables
  async getCables() {
    const response = await this.get(API_ENDPOINTS.CABLES_LIST);
    return response.json();
  }

  async createCable(data) {
    const response = await this.post(API_ENDPOINTS.CABLES_LIST, data);
    return response.json();
  }

  async updateCable(id, data) {
    const response = await this.put(`${API_ENDPOINTS.CABLES}/${id}`, data);
    return response.json();
  }

  async deleteCable(id) {
    return this.delete(`${API_ENDPOINTS.CABLES}/${id}`);
  }

  // Fiber Splices
  async getFiberSplices(cableId) {
    const response = await this.get(`${API_ENDPOINTS.FIBER_SPLICES_LIST}?cable_id=${cableId}`);
    return response.json();
  }

  async createFiberSplice(data) {
    const response = await this.post(API_ENDPOINTS.FIBER_SPLICES_LIST, data);
    return response.json();
  }

  async updateFiberSplice(id, data) {
    const response = await this.put(`${API_ENDPOINTS.FIBER_SPLICES}/${id}`, data);
    return response.json();
  }

  async deleteFiberSplice(id) {
    return this.delete(`${API_ENDPOINTS.FIBER_SPLICES}/${id}`);
  }

  // Export/Import
  async exportFull() {
    return this.get(API_ENDPOINTS.EXPORT_FULL);
  }

  async exportGeoJSON() {
    return this.get(API_ENDPOINTS.EXPORT_GEOJSON);
  }

  async importSchema(file) {
    const formData = new FormData();
    formData.append('file', file);
    return this.request(API_ENDPOINTS.IMPORT_SCHEMA, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${authService.getAccessToken()}`,
      },
    });
  }

  async importGeoJSON(file) {
    const formData = new FormData();
    formData.append('file', file);
    return this.request(API_ENDPOINTS.IMPORT_GEOJSON, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${authService.getAccessToken()}`,
      },
    });
  }
}

export default new APIClient();
