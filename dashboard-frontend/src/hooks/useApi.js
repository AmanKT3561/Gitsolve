import { useCallback, useEffect, useState } from 'react';

// Generic data hook. `fn` should be a stable function (wrap in useCallback at
// the call site, or pass deps). Returns { data, error, loading, refetch }.
export function useApi(fn, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const run = useCallback(() => {
    let active = true;
    setLoading(true);
    setError(null);
    Promise.resolve(fn())
      .then((res) => {
        if (active) setData(res);
      })
      .catch((err) => {
        if (active) setError(err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    const cancel = run();
    return cancel;
  }, [run]);

  return { data, error, loading, refetch: run };
}
