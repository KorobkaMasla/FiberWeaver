/**
 * Service for managing regions - loads data from backend API
 */

const API_BASE = 'http://localhost:8000/api';

// Create a new region
export async function createRegion(regionData) {
  try {
    const response = await fetch(`${API_BASE}/regions/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(regionData),
    });
    if (!response.ok) throw new Error('Failed to create region');
    return await response.json();
  } catch (error) {
    console.error('Error creating region:', error);
    throw error;
  }
}

// Get all regions
export async function getAllRegions() {
  try {
    const response = await fetch(`${API_BASE}/regions/`);
    if (!response.ok) throw new Error('Failed to fetch regions');
    return await response.json();
  } catch (error) {
    console.error('Error fetching regions:', error);
    return [];
  }
}

// Get region with all objects and cables
export async function getRegionData(regionId) {
  try {
    const response = await fetch(`${API_BASE}/regions/${regionId}`);
    if (!response.ok) throw new Error('Failed to fetch region data');
    return await response.json();
  } catch (error) {
    console.error('Error fetching region data:', error);
    return null;
  }
}

// Get all objects in region
export async function getRegionObjects(regionId) {
  try {
    const response = await fetch(`${API_BASE}/regions/${regionId}/objects`);
    if (!response.ok) throw new Error('Failed to fetch region objects');
    return await response.json();
  } catch (error) {
    console.error('Error fetching region objects:', error);
    return [];
  }
}

// Get all cables in region
export async function getRegionCables(regionId) {
  try {
    const response = await fetch(`${API_BASE}/regions/${regionId}/cables`);
    if (!response.ok) throw new Error('Failed to fetch region cables');
    return await response.json();
  } catch (error) {
    console.error('Error fetching region cables:', error);
    return [];
  }
}

// Add object to region
export async function addObjectToRegion(regionId, objectId) {
  try {
    const response = await fetch(`${API_BASE}/regions/${regionId}/objects/${objectId}`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to add object to region');
    return await response.json();
  } catch (error) {
    console.error('Error adding object to region:', error);
    throw error;
  }
}

// Remove object from region
export async function removeObjectFromRegion(regionId, objectId) {
  try {
    const response = await fetch(`${API_BASE}/regions/${regionId}/objects/${objectId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to remove object from region');
    return await response.json();
  } catch (error) {
    console.error('Error removing object from region:', error);
    throw error;
  }
}

// Add cable to region (only if both endpoints in region)
export async function addCableToRegion(regionId, cableId) {
  try {
    const response = await fetch(`${API_BASE}/regions/${regionId}/cables/${cableId}`, {
      method: 'POST',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to add cable to region');
    }
    return await response.json();
  } catch (error) {
    console.error('Error adding cable to region:', error);
    throw error;
  }
}

// Remove cable from region
export async function removeCableFromRegion(regionId, cableId) {
  try {
    const response = await fetch(`${API_BASE}/regions/${regionId}/cables/${cableId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to remove cable from region');
    return await response.json();
  } catch (error) {
    console.error('Error removing cable from region:', error);
    throw error;
  }
}

// Load objects by city from all network objects
export async function loadObjectsByCity(cityName) {
  try {
    // Get all network objects
    const response = await fetch(`${API_BASE}/network-objects/`);
    if (!response.ok) throw new Error('Failed to fetch network objects');
    
    const allObjects = await response.json();
    
    // Filter objects by address containing city name
    const filteredObjects = allObjects.filter(obj => 
      obj.address && obj.address.toLowerCase().includes(cityName.toLowerCase())
    );
    
    return filteredObjects;
  } catch (error) {
    console.error('Error loading objects by city:', error);
    return [];
  }
}

// Load cables connecting objects from the same city
export async function loadCablesByCity(objectsInCity) {
  try {
    if (objectsInCity.length === 0) return [];
    
    // Get all cables
    const response = await fetch(`${API_BASE}/cables/`);
    if (!response.ok) throw new Error('Failed to fetch cables');
    
    const allCables = await response.json();
    
    // Create a set of object IDs - используем оба возможных названия поля
    const objectIds = new Set();
    objectsInCity.forEach(obj => {
      if (obj.network_object_id) objectIds.add(obj.network_object_id);
      if (obj.id) objectIds.add(obj.id);
    });
    
    // Filter cables where both endpoints are in the city
    const filteredCables = allCables.filter(cable => {
      const hasFrom = objectIds.has(cable.from_object_id);
      const hasTo = objectIds.has(cable.to_object_id);
      return hasFrom && hasTo;
    });
    
    console.log(`Loaded ${filteredCables.length} cables for city`);
    return filteredCables;
  } catch (error) {
    console.error('Error loading cables by city:', error);
    return [];
  }
}

// Load objects for selected regions
export async function loadObjectsForRegions(regions) {
  try {
    if (!regions || regions.length === 0) return [];
    
    const allObjects = new Map(); // Use map to avoid duplicates
    
    // For each region, get its objects via the region endpoint
    for (const region of regions) {
      const response = await fetch(`${API_BASE}/regions/${region.region_id}`);
      if (!response.ok) continue;
      
      const regionData = await response.json();
      if (regionData.network_objects && Array.isArray(regionData.network_objects)) {
        regionData.network_objects.forEach(obj => {
          allObjects.set(obj.network_object_id || obj.id, obj);
        });
      }
    }
    
    return Array.from(allObjects.values());
  } catch (error) {
    console.error('Error loading objects for regions:', error);
    return [];
  }
}

// Load cables for selected regions
export async function loadCablesForRegions(regions) {
  try {
    if (!regions || regions.length === 0) return [];
    
    const allCables = new Map(); // Use map to avoid duplicates
    
    // For each region, get its cables
    for (const region of regions) {
      const response = await fetch(`${API_BASE}/regions/${region.region_id}`);
      if (!response.ok) continue;
      
      const regionData = await response.json();
      if (regionData.cables && Array.isArray(regionData.cables)) {
        regionData.cables.forEach(cable => {
          allCables.set(cable.cable_id || cable.id, cable);
        });
      }
    }
    
    return Array.from(allCables.values());
  } catch (error) {
    console.error('Error loading cables for regions:', error);
    return [];
  }
}
