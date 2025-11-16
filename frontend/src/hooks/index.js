// Custom hooks for data management

import { useState, useCallback, useEffect } from 'react';
import apiClient from '../utils/apiClient.js';

// Hook для загрузки сетевых объектов
export const useNetworkObjects = () => {
  const [objects, setObjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getNetworkObjects();
      setObjects(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (data) => {
    try {
      const newObject = await apiClient.createNetworkObject(data);
      setObjects((prev) => [...prev, newObject]);
      return newObject;
    } catch (err) {
      throw err;
    }
  }, []);

  const update = useCallback(async (id, data) => {
    try {
      const updated = await apiClient.updateNetworkObject(id, data);
      setObjects((prev) => prev.map((obj) => (obj.id === id ? updated : obj)));
      return updated;
    } catch (err) {
      throw err;
    }
  }, []);

  const remove = useCallback(async (id) => {
    try {
      await apiClient.deleteNetworkObject(id);
      setObjects((prev) => prev.filter((obj) => obj.id !== id));
    } catch (err) {
      throw err;
    }
  }, []);

  return { objects, loading, error, fetch, create, update, remove };
};

// Hook для загрузки кабелей
export const useCables = () => {
  const [cables, setCables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getCables();
      setCables(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (data) => {
    try {
      const newCable = await apiClient.createCable(data);
      setCables((prev) => [...prev, newCable]);
      return newCable;
    } catch (err) {
      throw err;
    }
  }, []);

  const update = useCallback(async (id, data) => {
    try {
      const updated = await apiClient.updateCable(id, data);
      setCables((prev) => prev.map((cable) => (cable.id === id ? updated : cable)));
      return updated;
    } catch (err) {
      throw err;
    }
  }, []);

  const remove = useCallback(async (id) => {
    try {
      await apiClient.deleteCable(id);
      setCables((prev) => prev.filter((cable) => cable.id !== id));
    } catch (err) {
      throw err;
    }
  }, []);

  return { cables, loading, error, fetch, create, update, remove };
};

// Hook для загрузки fiber splices
export const useFiberSplices = (cableId) => {
  const [splices, setSplices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    if (!cableId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getFiberSplices(cableId);
      setSplices(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [cableId]);

  const create = useCallback(async (data) => {
    try {
      const newSplice = await apiClient.createFiberSplice(data);
      setSplices((prev) => [...prev, newSplice]);
      return newSplice;
    } catch (err) {
      throw err;
    }
  }, []);

  const update = useCallback(async (id, data) => {
    try {
      const updated = await apiClient.updateFiberSplice(id, data);
      setSplices((prev) => prev.map((splice) => (splice.id === id ? updated : splice)));
      return updated;
    } catch (err) {
      throw err;
    }
  }, []);

  const remove = useCallback(async (id) => {
    try {
      await apiClient.deleteFiberSplice(id);
      setSplices((prev) => prev.filter((splice) => splice.id !== id));
    } catch (err) {
      throw err;
    }
  }, []);

  return { splices, loading, error, fetch, create, update, remove };
};

// Hook для управления loading состоянием
export const useAsync = (asyncFunction, immediate = true) => {
  const [status, setStatus] = useState('idle');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const execute = useCallback(async () => {
    setStatus('pending');
    setData(null);
    setError(null);
    try {
      const response = await asyncFunction();
      setData(response);
      setStatus('success');
      return response;
    } catch (err) {
      setError(err);
      setStatus('error');
      throw err;
    }
  }, [asyncFunction]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return { execute, status, data, error };
};

// Hook для управления boolean состоянием
export const useToggle = (initialValue = false) => {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => {
    setValue((prev) => !prev);
  }, []);

  const setTrue = useCallback(() => {
    setValue(true);
  }, []);

  const setFalse = useCallback(() => {
    setValue(false);
  }, []);

  return { value, toggle, setTrue, setFalse };
};

// Hook для управления form state
export const useForm = (initialValues, onSubmit) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleBlur = useCallback((e) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
        await onSubmit(values);
      } catch (err) {
        console.error('Form submission error:', err);
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, onSubmit]
  );

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    setValues,
    setErrors,
    resetForm,
  };
};
