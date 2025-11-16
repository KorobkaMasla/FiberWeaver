import React, { useEffect, useState } from 'react';
import '../styles/Toast.css';

function Toast({ message, type = 'success', onClose, duration = 4000, position = 'bottom-left' }) {
  const [isClosing, setIsClosing] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev - (100 / (duration / 50));
        return newProgress > 0 ? newProgress : 0;
      });
    }, 50);

    const timer = setTimeout(() => {
      setIsClosing(true);
      setTimeout(onClose, 300);
    }, duration);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [duration, onClose]);

  return (
    <div className={`toast toast-${type} toast-${position} ${isClosing ? 'toast-closing' : ''}`}>
      <div className="toast-content">
        <span className="toast-icon">
          {type === 'success' ? '✓' : '✕'}
        </span>
        <span className="toast-message">{message}</span>
      </div>
      <div className="toast-progress-bar" style={{ width: `${progress}%` }}></div>
    </div>
  );
}

export default Toast;
