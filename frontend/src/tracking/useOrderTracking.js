import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { shoesAPI } from "../api";

function socketUrl() {
  const api = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") || "http://localhost:5000";
  return import.meta.env.VITE_SOCKET_URL || api;
}

export default function useOrderTracking(orderId, { getToken, enabled = true }) {
  const [tracking, setTracking] = useState(null);
  const [error, setError] = useState("");
  const [live, setLive] = useState(false);
  const socketRef = useRef(null);

  const refresh = useCallback(async () => {
    if (!orderId) return;
    try {
      const token = await getToken?.().catch(() => null);
      let receiptToken;
      try {
        receiptToken = sessionStorage.getItem("shoes-receipt-token") || undefined;
      } catch {
        receiptToken = undefined;
      }
      const r = await shoesAPI.getOrderTracking(orderId, { token, receiptToken });
      setTracking(r.tracking);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }, [orderId, getToken]);

  useEffect(() => {
    if (!enabled || !orderId) return undefined;
    const kickoff = setTimeout(() => {
      void refresh();
    }, 0);
    const poll = setInterval(() => {
      void refresh();
    }, 20000);
    return () => {
      clearTimeout(kickoff);
      clearInterval(poll);
    };
  }, [enabled, orderId, refresh]);

  useEffect(() => {
    if (!enabled || !orderId || !getToken) return undefined;
    let active = true;
    (async () => {
      try {
        const token = await getToken();
        if (!active || !token) return;
        const socket = io(socketUrl(), {
          path: "/socket.io",
          transports: ["websocket", "polling"],
          auth: { token },
          reconnection: true,
          reconnectionAttempts: 8,
        });
        socketRef.current = socket;
        socket.on("connect", () => setLive(true));
        socket.on("disconnect", () => setLive(false));
        socket.emit("order:subscribe", { orderId }, (ack) => {
          if (!ack?.ok) setLive(false);
        });
        socket.on("order:update", (payload) => {
          if (payload?.fulfillmentStatus) setTracking((t) => ({ ...t, ...payload }));
        });
      } catch {
        setLive(false);
      }
    })();
    return () => {
      active = false;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [enabled, orderId, getToken]);

  return { tracking, error, live, refresh };
}