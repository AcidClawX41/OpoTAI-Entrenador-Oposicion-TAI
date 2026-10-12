// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import { useCallback, useEffect, useRef, useState, type DependencyList } from "react";
import { toApiError, type OpoApiError } from "@/api/errors";

export interface ApiState<T> {
  data: T | undefined;
  error: OpoApiError | undefined;
  loading: boolean;
  reload: () => void;
  setData: (data: T) => void;
}

/**
 * Carga datos de la API con estado de carga/error. Al recargar mantiene los
 * datos anteriores (sin parpadeos) hasta que llegan los nuevos.
 */
export function useApi<T>(fn: () => Promise<T>, deps: DependencyList, enabled = true): ApiState<T> {
  const [data, setDataState] = useState<T | undefined>(undefined);
  const [error, setError] = useState<OpoApiError | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [nonce, setNonce] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    fnRef.current().then(
      (value) => {
        if (!alive) return;
        setDataState(value);
        setError(undefined);
        setLoading(false);
      },
      (err: unknown) => {
        if (!alive) return;
        setError(toApiError(err));
        setLoading(false);
      },
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce, enabled]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const setData = useCallback((value: T) => {
    setDataState(value);
    setError(undefined);
  }, []);
  return { data, error, loading, reload, setData };
}
