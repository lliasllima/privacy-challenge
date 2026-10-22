const API_BASE = '/api';

export interface Creator {
  id: string;
  name: string;
}

export interface User {
  id: string;
  name: string;
}

export interface FollowerStatus {
  following: boolean;
}

export interface FollowerCount {
  creatorId: string;
  count: number;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: init?.body
        ? { 'Content-Type': 'application/json', ...init?.headers }
        : init?.headers,
    });
  } catch {
    throw new ApiError(0, 'Não foi possível conectar à API.');
  }

  if (!response.ok) {
    throw new ApiError(response.status, `A API respondeu ${response.status}.`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function getCreators(): Promise<Creator[]> {
  return request<Creator[]>('/creators');
}

export function createUser(name: string): Promise<User> {
  return request<User>('/users', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export function getFollowerStatus(
  creatorId: string,
  userId: string,
): Promise<FollowerStatus> {
  return request<FollowerStatus>(
    `/creators/${creatorId}/followers/${userId}`,
  );
}

export function getFollowerCount(creatorId: string): Promise<FollowerCount> {
  return request<FollowerCount>(`/creators/${creatorId}/followers/count`);
}

export function followCreator(
  creatorId: string,
  userId: string,
): Promise<{ creatorId: string; userId: string; following: boolean }> {
  return request(`/creators/${creatorId}/followers`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

export function unfollowCreator(
  creatorId: string,
  userId: string,
): Promise<void> {
  return request<void>(`/creators/${creatorId}/followers/${userId}`, {
    method: 'DELETE',
  });
}
