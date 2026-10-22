import { useEffect, useState } from 'react';
import {
  ApiError,
  type Creator,
  createUser,
  followCreator,
  getCreators,
  getFollowerCount,
  getFollowerStatus,
  unfollowCreator,
} from './api';

const USER_ID_KEY = 'seguir-criadora:userId';
const POLL_INTERVAL_MS = 5000;

function randomSuffix(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().slice(0, 4);
  }

  return Math.random().toString(16).slice(2, 6);
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  return 'Ocorreu um erro inesperado. Tente novamente.';
}

function isStaleResource(error: unknown): boolean {
  return (
    error instanceof ApiError && (error.status === 404 || error.status === 400)
  );
}

async function fetchFollowState(
  creatorId: string,
  userId: string,
): Promise<{ following: boolean; count: number }> {
  const [status, followerCount] = await Promise.all([
    getFollowerStatus(creatorId, userId),
    getFollowerCount(creatorId),
  ]);

  return { following: status.following, count: followerCount.count };
}

/**
 * Returns a userId that exists in the backend. If the id stored in
 * localStorage is gone (e.g. the database was recreated), it creates a new
 * visitor instead of failing.
 */
async function resolveUserId(creatorId: string): Promise<string> {
  const stored = localStorage.getItem(USER_ID_KEY);

  if (stored) {
    try {
      await getFollowerStatus(creatorId, stored);
      return stored;
    } catch (error) {
      if (isStaleResource(error)) {
        localStorage.removeItem(USER_ID_KEY);
      } else {
        throw error;
      }
    }
  }

  const user = await createUser(`Visitante-${randomSuffix()}`);
  localStorage.setItem(USER_ID_KEY, user.id);
  return user.id;
}

export default function App() {
  const [creator, setCreator] = useState<Creator | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load(): Promise<void> {
      setLoading(true);
      setError(null);

      try {
        const creators = await getCreators();

        if (creators.length === 0) {
          throw new ApiError(404, 'Nenhuma criadora cadastrada.');
        }

        const firstCreator = creators[0];
        const resolvedUserId = await resolveUserId(firstCreator.id);
        const state = await fetchFollowState(firstCreator.id, resolvedUserId);

        if (!active) {
          return;
        }

        setCreator(firstCreator);
        setUserId(resolvedUserId);
        setFollowing(state.following);
        setCount(state.count);
      } catch (loadError) {
        if (active) {
          setError(errorMessage(loadError));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!creator || !userId) {
      return;
    }

    let active = true;

    const intervalId = window.setInterval(() => {
      void (async () => {
        try {
          const state = await fetchFollowState(creator.id, userId);

          if (active) {
            setFollowing(state.following);
            setCount(state.count);
          }
        } catch (pollError) {
          if (active) {
            setError(errorMessage(pollError));
          }
        }
      })();
    }, POLL_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [creator, userId]);

  async function handleToggle(): Promise<void> {
    if (!creator || !userId || pending) {
      return;
    }

    setPending(true);
    setError(null);

    try {
      await toggle(creator.id, userId, following);
      const state = await fetchFollowState(creator.id, userId);
      setFollowing(state.following);
      setCount(state.count);
    } catch (toggleError) {
      if (isStaleResource(toggleError)) {
        // The user (or creator) vanished between visits: recreate and retry.
        try {
          const freshUserId = await resolveUserId(creator.id);
          setUserId(freshUserId);
          await toggle(creator.id, freshUserId, following);
          const state = await fetchFollowState(creator.id, freshUserId);
          setFollowing(state.following);
          setCount(state.count);
        } catch (retryError) {
          setError(errorMessage(retryError));
        }
      } else {
        setError(errorMessage(toggleError));
      }
    } finally {
      setPending(false);
    }
  }

  const canToggle = Boolean(creator && userId) && !pending;

  if (loading) {
    return (
      <main className="card">
        <p className="muted">Carregando…</p>
      </main>
    );
  }

  if (!creator) {
    return (
      <main className="card">
        <h1>Seguir criadora</h1>
        <p className="error" role="alert">
          {error ?? 'Nenhuma criadora encontrada.'}
        </p>
      </main>
    );
  }

  return (
    <main className="card">
      <h1>Seguir criadora</h1>
      <h2>{creator.name}</h2>
      <p className="count">
        <strong>{count ?? '—'}</strong>{' '}
        {count === 1 ? 'seguidor' : 'seguidores'}
      </p>
      <button type="button" onClick={handleToggle} disabled={!canToggle}>
        {pending ? 'Enviando…' : following ? 'Deixar de seguir' : 'Seguir'}
      </button>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </main>
  );
}

async function toggle(
  creatorId: string,
  userId: string,
  currentlyFollowing: boolean,
): Promise<void> {
  if (currentlyFollowing) {
    await unfollowCreator(creatorId, userId);
    return;
  }

  await followCreator(creatorId, userId);
}
