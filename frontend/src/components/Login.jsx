import React, { useState } from 'react';
import authService from '../services/authService';
import './Auth.css';

function Login({ onLoginSuccess, onSwitchPage }) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      console.log('Attempting login with:', { login, password: '***' });
      await authService.login(login, password);
      console.log('Login successful');
      onLoginSuccess();
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>🔐 Вход</h1>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="login">Логин</label>
            <input
              id="login"
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="Введите свой логин"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Пароль</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите свой пароль"
              required
              disabled={loading}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? '⏳ Вхожде...' : '✓ Вход'}
          </button>
        </form>

        <p className="auth-link">
          Нет аккаунта? <a href="#" onClick={(e) => { e.preventDefault(); onSwitchPage('register'); }}>Регистрируйтесь</a>
        </p>
      </div>
    </div>
  );
}

export default Login;

