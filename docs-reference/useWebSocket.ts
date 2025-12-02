import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

interface WebSocketHookOptions {
  autoConnect?: boolean;
  onTenderUpdate?: (data: any) => void;
  onInventoryUpdate?: (data: any) => void;
  onNotification?: (data: any) => void;
  onDashboardMetrics?: (metrics: any) => void;
}

export function useWebSocket(options: WebSocketHookOptions = {}) {
  const {
    autoConnect = true,
    onTenderUpdate,
    onInventoryUpdate,
    onNotification,
    onDashboardMetrics,
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!autoConnect) return;

    // Connect to WebSocket server
    const socket = io({
      path: "/socket.io/",
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[WebSocket] Connected");
      setIsConnected(true);
      // Join dashboard room for updates
      socket.emit("join:dashboard");
    });

    socket.on("disconnect", () => {
      console.log("[WebSocket] Disconnected");
      setIsConnected(false);
    });

    // Listen for tender updates
    if (onTenderUpdate) {
      socket.on("tender:update", onTenderUpdate);
    }

    // Listen for inventory updates
    if (onInventoryUpdate) {
      socket.on("inventory:update", onInventoryUpdate);
    }

    // Listen for notifications
    if (onNotification) {
      socket.on("notification", onNotification);
    }

    // Listen for dashboard metrics
    if (onDashboardMetrics) {
      socket.on("dashboard:metrics", onDashboardMetrics);
    }

    return () => {
      socket.emit("leave:dashboard");
      socket.disconnect();
    };
  }, [autoConnect, onTenderUpdate, onInventoryUpdate, onNotification, onDashboardMetrics]);

  return {
    socket: socketRef.current,
    isConnected,
  };
}
