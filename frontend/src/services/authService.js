const API_BASE_URL = 'http://localhost:8000/api';

class AuthService {
  setTokens(accessToken, refreshToken) {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  }

  getAccessToken() {
    return localStorage.getItem('access_token');
  }

  getRefreshToken() {
    return localStorage.getItem('refresh_token');
  }

  clearTokens() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  }

  setUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
  }

  getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  isAuthenticated() {
    return !!this.getAccessToken();
  }

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

  logout() {
    this.clearTokens();
  }

  async getCurrentUser() {
    const response = await this.authenticatedFetch(`${API_BASE_URL}/auth/me`);
    if (!response.ok) {
      throw new Error('Ошибка получения онфо');
    }
    const user = await response.json();
    this.setUser(user);
    return user;
  }

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
