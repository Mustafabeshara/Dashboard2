import { Server as HTTPServer } from "http";
import { Server as SocketIOServer } from "socket.io";

let io: SocketIOServer | null = null;

export function initializeWebSocket(httpServer: HTTPServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*", // In production, specify your frontend URL
      methods: ["GET", "POST"],
    },
    path: "/socket.io/",
  });

  io.on("connection", (socket) => {
    console.log(`[WebSocket] Client connected: ${socket.id}`);

    socket.on("disconnect", () => {
      console.log(`[WebSocket] Client disconnected: ${socket.id}`);
    });

    // Join specific rooms for targeted updates
    socket.on("join:dashboard", () => {
      socket.join("dashboard");
      console.log(`[WebSocket] Client ${socket.id} joined dashboard room`);
    });

    socket.on("leave:dashboard", () => {
      socket.leave("dashboard");
      console.log(`[WebSocket] Client ${socket.id} left dashboard room`);
    });
  });

  console.log("[WebSocket] Server initialized");
  return io;
}

export function getWebSocketServer(): SocketIOServer | null {
  return io;
}

// Event emitters for different types of updates
export function emitTenderUpdate(data: { type: string; tender: any }) {
  if (io) {
    io.to("dashboard").emit("tender:update", data);
    console.log(`[WebSocket] Emitted tender update: ${data.type}`);
  }
}

export function emitInventoryUpdate(data: { type: string; item: any }) {
  if (io) {
    io.to("dashboard").emit("inventory:update", data);
    console.log(`[WebSocket] Emitted inventory update: ${data.type}`);
  }
}

export function emitNotification(data: { title: string; message: string; type: string }) {
  if (io) {
    io.to("dashboard").emit("notification", data);
    console.log(`[WebSocket] Emitted notification: ${data.title}`);
  }
}

export function emitDashboardMetricsUpdate(metrics: any) {
  if (io) {
    io.to("dashboard").emit("dashboard:metrics", metrics);
    console.log("[WebSocket] Emitted dashboard metrics update");
  }
}
