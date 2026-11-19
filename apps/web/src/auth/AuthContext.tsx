import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthUser, LoginDto } from '@servigest/shared';
import {
  api,
  getAccessToken,
  refreshAccessToken,
  setAccessToken,
} from '../lib/api';
import type { User } from '../lib/types';

interface LoginResult {
  accessToken: string;
  expiresIn: number;
  user: User;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginDto) => Promise<User>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function asUser(user: AuthUser | User): User {
  return { ...user, phone: 'phone' in user ? user.phone ?? null : null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        const token = await refreshAccessToken();
        if (!token || !active) return;
        const profile = await api.get<User>('/auth/me');
        if (active) setUser(profile);
      } catch {
        setAccessToken(null);
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    void bootstrap();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (credentials: LoginDto) => {
    const result = await api.post<LoginResult>('/auth/login', credentials, {
      auth: false,
    });
    setAccessToken(result.accessToken);
    const profile = asUser(result.user);
    setUser(profile);
    return profile;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // La sesión local se limpia incluso si el servidor no responde.
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (!getAccessToken()) return;
    const profile = await api.get<User>('/auth/me');
    setUser(profile);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout, updateUser: setUser, refreshUser }),
    [user, loading, login, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}
