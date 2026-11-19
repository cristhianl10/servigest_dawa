import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { NotificationEvent } from '@servigest/shared';
import {
  API_URL,
  ApiError,
  api,
  getAccessToken,
  refreshAccessToken,
} from '../lib/api';
import type { NotificationItem } from '../lib/types';
import { useToast } from '../components/Toast';
import { useAuth } from '../auth/AuthContext';

interface NotificationsState {
  unreadCount: number;
  connected: boolean;
  refreshUnread: () => Promise<void>;
}

export function useNotifications(): NotificationsState {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [unreadCount, setUnreadCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const reconnectRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const refreshUnread = useCallback(async () => {
    if (!user) return;
    try {
      const response = await api.list<NotificationItem>('/notificaciones?page=1&pageSize=1');
      setUnreadCount(response.meta.unreadCount ?? 0);
    } catch {
      // El badge no debe romper la sesión si la consulta falla.
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setConnected(false);
      return;
    }
    void refreshUnread();
  }, [user, refreshUnread]);

  useEffect(() => {
    if (!user) return;

    let attempt = 0;
    let disposed = false;

    const scheduleReconnect = () => {
      if (disposed) return;
      attempt += 1;
      const delay = Math.min(30_000, 1_000 * 2 ** Math.min(attempt, 5));
      reconnectRef.current = window.setTimeout(() => void connect(), delay);
    };

    const handleEvent = (event: NotificationEvent) => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['requests'] });
      void refreshUnread();
      toast.notify({
        title: event.title,
        message: event.body,
        tone: 'info',
      });
    };

    const connect = async () => {
      if (disposed) return;
      abortRef.current = new AbortController();

      try {
        let token = getAccessToken();
        if (!token) token = await refreshAccessToken();
        if (!token) {
          scheduleReconnect();
          return;
        }

        const response = await fetch(`${API_URL}/notificaciones/stream`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'text/event-stream',
          },
          signal: abortRef.current.signal,
          credentials: 'include',
        });

        if (!response.ok) {
          if (response.status === 401) {
            const renewed = await refreshAccessToken();
            if (renewed) {
              scheduleReconnect();
              return;
            }
          }
          scheduleReconnect();
          return;
        }

        if (!response.body) {
          scheduleReconnect();
          return;
        }

        attempt = 0;
        setConnected(true);
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!disposed) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let boundary = buffer.indexOf('\n\n');
          while (boundary >= 0) {
            const chunk = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            boundary = buffer.indexOf('\n\n');

            if (!chunk || chunk.startsWith(':')) continue;
            const lines = chunk.split('\n');
            const eventName = lines.find((line) => line.startsWith('event:'))?.slice(6).trim();
            const data = lines
              .filter((line) => line.startsWith('data:'))
              .map((line) => line.slice(5).trim())
              .join('\n');

            if (eventName === 'notification' && data) {
              try {
                handleEvent(JSON.parse(data) as NotificationEvent);
              } catch {
                // Ignorar payload inválido y mantener el stream.
              }
            }
          }
        }
        setConnected(false);
        if (!disposed) scheduleReconnect();
      } catch (err) {
        if (disposed || (err as DOMException)?.name === 'AbortError') return;
        if (err instanceof ApiError && err.status === 401) {
          await refreshAccessToken();
        }
        setConnected(false);
        scheduleReconnect();
      }
    };

    void connect();

    return () => {
      disposed = true;
      setConnected(false);
      abortRef.current?.abort();
      if (reconnectRef.current) window.clearTimeout(reconnectRef.current);
    };
  }, [user, queryClient, refreshUnread, toast]);

  return { unreadCount, connected, refreshUnread };
}
