import L from 'leaflet';

const defaultObjectTypeEmojis = {
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

const defaultObjectTypeNames = {
  node: 'Узел',
  coupling: 'Муфта',
  cabinet: 'Шкаф',
  splitter: 'Сплиттер',
  subscriber: 'Абонент',
  pole: 'Столб',
  well: 'Колодец',
  camera: 'Камера',
  wifi: 'Wi-Fi'
};

export let objectTypeEmojis = { ...defaultObjectTypeEmojis };
export let objectTypeNames = { ...defaultObjectTypeNames };

export const updateObjectTypesFromDB = (dbObjectTypes) => {
  if (!dbObjectTypes || !Array.isArray(dbObjectTypes)) return;
  
  const newEmojis = {};
  const newNames = {};
  
  dbObjectTypes.forEach(type => {
    // Use 'name' field as the key (e.g., 'node', 'coupling')
    newEmojis[type.name] = type.emoji || defaultObjectTypeEmojis[type.name] || '';
    // Use 'display_name' for the display value (e.g., 'Узел', 'Муфта')
    newNames[type.name] = type.display_name || defaultObjectTypeNames[type.name] || type.name;
  });
  
  // Update exports
  objectTypeEmojis = newEmojis;
  objectTypeNames = newNames;
};

// Cable colors
export const cableTypeColors = {
  optical: '#4a9eff', // base/fallback optical color
  copper: '#f59e0b'
};

// Fiber count specific colors (exact matches).
// Keep provided hexes; slight style tweaks (same color, adjusted alpha usage done at call sites if needed).
export const fiberCountColors = {
  2: '#0000ff',     // #00f normalized
  4: '#00bff3',
  6: '#00736a',
  8: '#00ff00',     // #0f0 normalized
  16: '#91278f',
  24: '#f16522',
  32: '#827a00',
  48: '#ff0000',    // #f00 normalized
  64: '#ff00ff'     // #f0f normalized
};

/**
 * Create custom marker icon with emoji
 */
export const createMarkerIcon = (emoji, highlight = false) => {
  return L.divIcon({
    html: `<div style="
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      background-color: ${highlight ? '#ff6b6b' : '#1f2937'};
      border: 2px solid ${highlight ? '#fca5a5' : '#4b5563'};
      border-radius: 50%;
      font-size: 18px;
      box-shadow: 0 0 8px rgba(0, 0, 0, 0.4);
      transition: all 0.2s;
    ">${emoji}</div>`,
    className: 'emoji-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
};

/**
 * Get cable color by type and fiber count
 */
export const getCableColor = (cableTypeName, fiberCount, dbColor) => {
  // Priority 1: Use color from DB if available
  if (dbColor) {
    // Convert hex format if needed (from "0000FF" to "#0000FF")
    return dbColor.startsWith('#') ? dbColor : `#${dbColor}`;
  }
  
  // Priority 2: For optical cables with fiber_count, use specific color
  if (cableTypeName === 'optical' && fiberCount && fiberCountColors[fiberCount]) {
    return fiberCountColors[fiberCount];
  }
  
  // Priority 3: Use generic cable type color
  if (cableTypeColors[cableTypeName]) {
    return cableTypeColors[cableTypeName];
  }
  
  // Priority 4: Fallback to blue
  return '#3b82f6';
};

/**
 * Find cable type from DB by fiber_count
 * Searches through cableTypes array and returns matching type or null
 */
export const findCableTypeByFiberCount = (fiberCount, cableTypes = []) => {
  if (!fiberCount || !Array.isArray(cableTypes)) return null;
  return cableTypes.find(t => t.fiber_count === fiberCount) || null;
};

/**
 * Calculate distance between two points in km
 */
export const calculateDistance = (p1, p2, lat2Optional, lon2Optional) => {
  // Support both (lat1, lon1, lat2, lon2) and ([lat1, lon1], [lat2, lon2]) signatures.
  let lat1, lon1, lat2, lon2;
  if (Array.isArray(p1) && Array.isArray(p2)) {
    [lat1, lon1] = p1;
    [lat2, lon2] = p2;
  } else {
    lat1 = p1;
    lon1 = p2;
    lat2 = lat2Optional;
    lon2 = lon2Optional;
  }
  if ([lat1, lon1, lat2, lon2].some(v => typeof v !== 'number')) return 0;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Format distance for display
 */
export const formatDistance = (km) => {
  if (km < 1) {
    return `${(km * 1000).toFixed(0)}m`;
  }
  return `${km.toFixed(2)}km`;
};

/**
 * Reverse geocode coordinates to get address using Nominatim API
 */
export const reverseGeocode = async (latitude, longitude) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CableNetworkDocumentation/1.0'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract address components
    const address = data.address || {};
    const road = address.road || '';
    const house_number = address.house_number || '';
    const city = address.city || address.town || address.village || '';
    const postcode = address.postcode || '';
    const country = address.country || '';
    
    // Build full address string
    let fullAddress = [];
    if (road) {
      fullAddress.push(road);
      if (house_number) fullAddress[0] += `, ${house_number}`;
    }
    if (city) fullAddress.push(city);
    if (postcode) fullAddress.push(postcode);
    if (country) fullAddress.push(country);
    
    // Fallback to display_name if we couldn't parse components
    const addressString = fullAddress.length > 0 
      ? fullAddress.join(', ')
      : data.display_name || 'Unknown address';
    
    return addressString;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return '';
  }
};

/**
 * Forward geocode search query to get suggestions with coordinates
 */
export const forwardGeocode = async (query, signal) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CableNetworkDocumentation/1.0'
        },
        signal
      }
    );
    
    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return data.map(result => ({
      lat: parseFloat(result.lat),
      lon: parseFloat(result.lon),
      display_name: result.display_name,
      boundingbox: result.boundingbox
    }));
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('Forward geocoding error:', error);
    }
    throw error;
  }
};
