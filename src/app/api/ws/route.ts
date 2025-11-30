/**
 * WebSocket API Endpoint
 * Real-time updates for dashboard and notifications
 */

import { NextRequest } from 'next/server'
import { WebSocketServer } from '@/lib/websocket'

export async function GET(request: NextRequest) {
  // Check if this is a WebSocket upgrade request
  const upgrade = request.headers.get('upgrade')
  
  if (upgrade !== 'websocket') {
    return new Response('Expected WebSocket upgrade', { status: 426 })
  }

  try {
    // Initialize WebSocket server
    const server = WebSocketServer.getInstance()
    
    // Handle the upgrade
    const { socket, response } = await server.handleUpgrade(request)
    
    return response
  } catch (error) {
    console.error('WebSocket upgrade error:', error)
    return new Response('WebSocket upgrade failed', { status: 500 })
  }
}
