import { useEffect, useState } from 'react';

export interface LiveVideoState {
  progress: number;
  loaded: boolean;
  objectUrl: string | null;
  error: boolean;
}

interface LiveVideoEntry {
  state: LiveVideoState;
  listeners: Set<() => void>;
  started: boolean;
}

const EMPTY_STATE: LiveVideoState = {
  progress: 0,
  loaded: false,
  objectUrl: null,
  error: false,
};

const entries = new Map<string, LiveVideoEntry>();

function getEntry(url: string): LiveVideoEntry {
  const existing = entries.get(url);
  if (existing) return existing;

  const entry: LiveVideoEntry = {
    state: EMPTY_STATE,
    listeners: new Set(),
    started: false,
  };
  entries.set(url, entry);
  return entry;
}

function emit(entry: LiveVideoEntry) {
  entry.listeners.forEach((listener) => listener());
}

function updateState(entry: LiveVideoEntry, patch: Partial<LiveVideoState>) {
  entry.state = { ...entry.state, ...patch };
  emit(entry);
}

function startLoading(url: string, entry: LiveVideoEntry) {
  if (entry.started) return;
  entry.started = true;

  const request = new XMLHttpRequest();
  request.open('GET', url);
  request.responseType = 'blob';

  request.onprogress = (event) => {
    if (!event.lengthComputable || event.total <= 0) return;
    updateState(entry, {
      progress: Math.min(1, event.loaded / event.total),
    });
  };

  request.onload = () => {
    if (request.status < 200 || request.status >= 300) {
      updateState(entry, { error: true, progress: 0 });
      return;
    }

    const blob = request.response as Blob | null;
    if (!blob || blob.size === 0) {
      updateState(entry, { error: true, progress: 0 });
      return;
    }

    updateState(entry, {
      progress: 1,
      loaded: true,
      objectUrl: URL.createObjectURL(blob),
    });
  };

  request.onerror = () => {
    updateState(entry, { error: true, progress: 0 });
  };

  request.send();
}

export function useLiveVideo(url?: string | null, enabled = true) {
  const [state, setState] = useState<LiveVideoState>(() =>
    url ? getEntry(url).state : EMPTY_STATE
  );

  useEffect(() => {
    if (!url || !enabled) {
      setState(EMPTY_STATE);
      return;
    }

    const entry = getEntry(url);
    const listener = () => setState(entry.state);
    setState(entry.state);
    entry.listeners.add(listener);
    startLoading(url, entry);

    return () => {
      entry.listeners.delete(listener);
    };
  }, [enabled, url]);

  return state;
}
