import React, { useEffect, useState } from 'react';
import '../styles/ToolsNotification.css';

function ToolsNotification({ message, duration = 3000 }) {
  const [progress, setProgress] = useState(100);
  const [isVisible, setIsVisible] = useState(false);  // Начинаем невидимыми
  const [isMounted, setIsMounted] = useState(false);  // Отслеживаем монтирование

  useEffect(() => {
    const mountTimer = setTimeout(() => {
      setIsMounted(true);
    }, 10); 

    return () => clearTimeout(mountTimer);
  }, []);

  useEffect(() => {
    if (isMounted) {
      setProgress(100);
      setIsVisible(true);

      const interval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev - (100 / (duration / 50));
          return newProgress > 0 ? newProgress : 0;
        });
      }, 50);

      const timer = setTimeout(() => {
        setIsVisible(false);
      }, duration);

      return () => {
        clearInterval(interval);
        clearTimeout(timer);
      };
    }
  }, [isMounted, duration, message]);

  return (
    <div 
      className={`tools-notification 
        ${isMounted && isVisible ? 'tools-notification-open' : ''} 
        ${!isVisible && isMounted ? 'tools-notification-closing' : ''}`
      }
    >
      <div className="tools-notification-text">{message}</div>
      <div className="tools-notification-timer" style={{ width: `${progress}%` }}></div>
    </div>
  );
}

export default ToolsNotification;
