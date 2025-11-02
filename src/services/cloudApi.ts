import type { ArchiveInfo, FuelStore } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

function resolve(path: string){
  if (/^https?:\/\//i.test(path)) return path;
  if (!API_BASE) return path;
  if (path.startsWith('/')) return `${API_BASE}${path}`;
  return `${API_BASE}/${path}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T>{
  const headers = new Headers(init?.headers ?? undefined);
  const hasBody = init?.body !== undefined && init.body !== null;
  if (hasBody && !headers.has('Content-Type')){
    headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(resolve(path), {
    ...init,
    credentials: 'include',
    headers,
  });
  if (response.status === 204){
    return undefined as T;
  }
  const text = await response.text();
  if (!response.ok){
    const message = text || 'Richiesta API non riuscita.';
    throw new Error(message);
  }
  if (!text){
    return undefined as T;
  }
  return JSON.parse(text) as T;
}

export type ArchiveResponse = {
  store: FuelStore;
  info: ArchiveInfo;
};

export async function fetchArchive(){
  return request<ArchiveResponse>('/api/archive');
}

export async function saveArchive(store: FuelStore){
  return request<ArchiveInfo>('/api/archive', {
    method: 'PUT',
    body: JSON.stringify({ store })
  });
}
