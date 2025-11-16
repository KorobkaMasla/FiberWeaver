/**
 * Утилиты для работы с регионами и геокодированием
 */

/**
 * Определяет город/регион по координатам используя Nominatim
 * @param {number} lat - Широта
 * @param {number} lon - Долгота
 * @returns {Promise<Object>} Объект с информацией о городе
 */
export async function getLocationName(lat, lon) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1&zoom=10&accept-language=ru`,
      { headers: { 'Accept-Language': 'ru' } }
    );
    const data = await response.json();
    
    if (data.address) {
      const address = data.address;
      // Приоритет: city -> town -> village -> county -> region
      const locationName = 
        address.city || 
        address.town || 
        address.village || 
        address.county || 
        address.region || 
        'Неизвестное местоположение';
      
      return {
        name: locationName,
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        type: 'reverse_geocoded',
        address: data.address
      };
    }
    return null;
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return null;
  }
}

/**
 * Вычисляет расстояние между двумя точками на земле (формула Хаверсина)
 * @param {number} lat1 - Широта первой точки
 * @param {number} lon1 - Долгота первой точки
 * @param {number} lat2 - Широта второй точки
 * @param {number} lon2 - Долгота второй точки
 * @returns {number} Расстояние в километрах
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Радиус земли в км
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Проверяет, находится ли точка внутри регионов
 * @param {number} lat - Широта точки
 * @param {number} lon - Долгота точки
 * @param {Array} regions - Массив регионов с координатами
 * @param {number} radiusKm - Радиус в км
 * @returns {Array} Массив регионов, в которые попадает точка
 */
export function getRegionsForPoint(lat, lon, regions, radiusKm = 50) {
  return regions.filter(region => {
    const distance = calculateDistance(lat, lon, region.lat, region.lon);
    return distance <= radiusKm;
  });
}

/**
 * Фильтрует объекты по выбранным регионам
 * @param {Array} objects - Массив объектов сети
 * @param {Array} regions - Выбранные регионы
 * @param {number} radiusKm - Радиус поиска
 * @returns {Array} Отфильтрованные объекты
 */
export function filterObjectsByRegions(objects, regions, radiusKm = 50) {
  if (!regions || regions.length === 0) {
    return objects; // Если регионы не выбраны, показываем всё
  }

  return objects.filter(obj => {
    if (!obj.latitude || !obj.longitude) return false;
    const matchingRegions = getRegionsForPoint(obj.latitude, obj.longitude, regions, radiusKm);
    return matchingRegions.length > 0;
  });
}

/**
 * Получает граничный прямоугольник (bounds) для набора регионов
 * @param {Array} regions - Массив регионов
 * @returns {Object} Объект с north, south, east, west координатами
 */
export function getRegionsBounds(regions) {
  if (!regions || regions.length === 0) {
    return null;
  }

  let north = regions[0].lat;
  let south = regions[0].lat;
  let east = regions[0].lon;
  let west = regions[0].lon;

  regions.forEach(region => {
    north = Math.max(north, region.lat);
    south = Math.min(south, region.lat);
    east = Math.max(east, region.lon);
    west = Math.min(west, region.lon);
  });

  return { north, south, east, west };
}
