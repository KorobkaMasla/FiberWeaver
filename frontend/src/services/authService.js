// API service with authentication
const API_BASE_URL = 'http://localhost:8000/api';

class AuthService {
  // Сохранение токенов в localStorage
  setTokens(accessToken, refreshToken) {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  }

  // Получение access token
  getAccessToken() {
    return localStorage.getItem('access_token');
  }

  // Получение refresh token
  getRefreshToken() {
    return localStorage.getItem('refresh_token');
  }

  // Очистка токенов (при логауте)
  clearTokens() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  }

  // Сохранение информации о пользователе
  setUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
  }

  // Получение информации о пользователе
  getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  // Проверка, авторизован ли пользователь
  isAuthenticated() {
    return !!this.getAccessToken();
  }

  // Регистрация
  async register(login, email, password) {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, email, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Ошибка регистрации');
    }

    const data = await response.json();
    this.setTokens(data.access_token, data.refresh_token);
    this.setUser(data.user);
    return data;
  }

  // Логин
  async login(login, password) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Ошибка входа');
    }

    const data = await response.json();
    this.setTokens(data.access_token, data.refresh_token);
    this.setUser(data.user);
    return data;
  }


  // Обновление access token
  async refreshAccessToken() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('Нет токена обновления');
    }

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken })
    });

    if (!response.ok) {
      this.clearTokens();
      throw new Error('Ошибка обновления токена');
    }

    const data = await response.json();
    this.setTokens(data.access_token, data.refresh_token);
    this.setUser(data.user);
    return data;
  }

  // Логаут
  logout() {
    this.clearTokens();
  }

  // Получить информацию о текущем пользователе
  async getCurrentUser() {
    const response = await this.authenticatedFetch(`${API_BASE_URL}/auth/me`);
    if (!response.ok) {
      throw new Error('Ошибка получения онфо');
    }
    const user = await response.json();
    this.setUser(user);
    return user;
  }

  // Вспомогательный метод для API запросов с авторизацией
  async authenticatedFetch(url, options = {}) {
    const accessToken = this.getAccessToken();

    if (!accessToken) {
      throw new Error('Не авторизованы');
    }

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`
    };

    let response = await fetch(url, { ...options, headers });

    // Если получили 401, пытаемся обновить токен
    if (response.status === 401) {
      try {
        await this.refreshAccessToken();
        const newAccessToken = this.getAccessToken();
        headers['Authorization'] = `Bearer ${newAccessToken}`;
        response = await fetch(url, { ...options, headers });
      } catch (error) {
        this.clearTokens();
        window.location.href = '/login';
        throw error;
      }
    }

    return response;
  }
}

export default new AuthService();
