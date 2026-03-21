import { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useNotificationStore } from '../store/notificationStore';

export function useWebSocket(token: string | null) {
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    if (!token) return;

    const wsProtocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/deadlines?token=${encodeURIComponent(token)}`;

    const client = new Client({
      webSocketFactory: () => new SockJS(wsUrl),
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        useNotificationStore.getState().setWsConnected(true);

        // Subscribe to user-scoped destination; Spring routes /user/topic/deadlines
        // to the authenticated user's session based on the Principal set during handshake
        client.subscribe('/user/topic/deadlines', (message) => {
          try {
            const payload = JSON.parse(message.body);
            useNotificationStore.getState().addRealtimeNotification({
              id: `ws-${payload.deadlineId}-${Date.now()}`,
              user_id: '',
              type: 'assignment_due',
              title: payload.title,
              message: `${payload.title} — due ${new Date(payload.dueAt).toLocaleString()}`,
              read: false,
              created_at: new Date().toISOString(),
            });
          } catch {
            // ignore malformed messages
          }
        });
      },
      onDisconnect: () => {
        useNotificationStore.getState().setWsConnected(false);
      },
      onStompError: () => {
        useNotificationStore.getState().setWsConnected(false);
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      client.deactivate();
      clientRef.current = null;
      useNotificationStore.getState().setWsConnected(false);
    };
  }, [token]);
}
