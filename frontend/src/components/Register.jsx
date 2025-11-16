import React, { useState } from 'react';
import authService from '../services/authService';
import './Auth.css';

function Register({ onRegisterSuccess, onSwitchPage }) {
  const [login, setLogin] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Валидация формы
    if (password !== passwordConfirm) {
      setError('Пароли не совпадают');
      return;
    }

    if (password.length < 6) {
      setError('Пароль должен быть не менее 6 симв');
      return;
    }

    setLoading(true);

    try {
      console.log('Attempting registration with:', { login, email });
      await authService.register(login, email, password);
      console.log('Registration successful');
      onRegisterSuccess();
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>📏 Регистрация</h1>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="login">Логин</label>
            <input
              id="login"
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="Введите свой логин"
              minLength="3"
              maxLength="50"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Введите свой email"
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
              placeholder="Выберите пароль (мин 6 симв)"
              minLength="6"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="passwordConfirm">Подтвердите пароль</label>
            <input
              id="passwordConfirm"
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="Подтвердите пароль"
              minLength="6"
              required
              disabled={loading}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? '⏳ Регистрируюсь...' : '✓ Регистрация'}
          </button>
        </form>

        <p className="auth-link">
          Уже есть аккаунт? <a href="#" onClick={(e) => { e.preventDefault(); onSwitchPage('login'); }}>Войдите</a>
        </p>
      </div>
    </div>
  );
}

export default Register;

