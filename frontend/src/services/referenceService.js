import authService from './authService';

const API_BASE_URL = 'http://localhost:8000/api';

export const referenceService = {
  // Cable Types
  async getCableTypes() {
    try {
      const response = await authService.authenticatedFetch(`${API_BASE_URL}/reference/cable-types`);
      return response.ok ? await response.json() : [];
    } catch (error) {
      console.error('Error fetching cable types:', error);
      throw error;
    }
  },

  async getCableTypeById(id) {
    try {
      const response = await authService.authenticatedFetch(`${API_BASE_URL}/reference/cable-types/${id}`);
      return response.ok ? await response.json() : null;
    } catch (error) {
      console.error('Error fetching cable type:', error);
      throw error;
    }
  },

  async createCableType(cableType) {
    try {
      const response = await authService.authenticatedFetch(`${API_BASE_URL}/reference/cable-types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cableType)
      });
      return response.ok ? await response.json() : null;
    } catch (error) {
      console.error('Error creating cable type:', error);
      throw error;
    }
  },

  // Object Types
  async getObjectTypes() {
    try {
      const response = await authService.authenticatedFetch(`${API_BASE_URL}/reference/object-types`);
      return response.ok ? await response.json() : [];
    } catch (error) {
      console.error('Error fetching object types:', error);
      throw error;
    }
  },

  async getObjectTypeById(id) {
    try {
      const response = await authService.authenticatedFetch(`${API_BASE_URL}/reference/object-types/${id}`);
      return response.ok ? await response.json() : null;
    } catch (error) {
      console.error('Error fetching object type:', error);
      throw error;
    }
  },

  async createObjectType(objectType) {
    try {
      const response = await authService.authenticatedFetch(`${API_BASE_URL}/reference/object-types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(objectType)
      });
      return response.ok ? await response.json() : null;
    } catch (error) {
      console.error('Error creating object type:', error);
      throw error;
    }
  },
};
