import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';

// Keep data requests local: changing a page must not trigger an auth redirect.
export default function useApiResource(path) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    setData([]);
    setLoading(true);
    setError('');
    if (!path) { setLoading(false); return () => controller.abort(); }
    api.get(path, { signal: controller.signal }).then(response => {
      if (!controller.signal.aborted) setData(response.data);
    }).catch(err => {
      if (!controller.signal.aborted) setError(err.response?.data?.message || 'Could not load this information. Please try again.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [path, revision]);
  return { data, loading, error, reload };
}
