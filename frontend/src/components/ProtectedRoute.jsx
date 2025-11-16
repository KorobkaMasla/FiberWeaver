import React from 'react';
import authService from '../services/authService';

/**
 * Компонент защищённого маршрута
 * Перенаправляет на страницу входа, если пользователь не аутентифицирован
 */
function ProtectedRoute({ children, redirectTo = '/login' }) {
  if (!authService.isAuthenticated()) {
    window.location.href = redirectTo;
    return null;
  }

  return children;
}

export default ProtectedRoute;
