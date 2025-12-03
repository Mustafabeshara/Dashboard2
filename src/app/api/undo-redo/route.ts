/**
 * Undo/Redo API Endpoints
 * GET - Get undo/redo status
 * POST - Execute undo or redo operation
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { commandManager } from '@/lib/undo-redo/command-manager'

// GET /api/undo-redo - Get current undo/redo status
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const status = commandManager.getStatus(session.user.id)
    const history = commandManager.getCommandHistory(session.user.id, 10)

    return NextResponse.json({
      success: true,
      ...status,
      recentCommands: history.map(cmd => ({
        id: cmd.id,
        type: cmd.type,
        description: cmd.description,
        entityType: cmd.entityType,
        entityId: cmd.entityId,
        timestamp: cmd.timestamp,
      })),
    })
  } catch (error) {
    console.error('Error getting undo/redo status:', error)
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 })
  }
}

// POST /api/undo-redo - Execute undo or redo
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body

    if (!action || !['undo', 'redo'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Use "undo" or "redo"' },
        { status: 400 }
      )
    }

    let result
    if (action === 'undo') {
      result = await commandManager.undo(session.user.id)
    } else {
      result = await commandManager.redo(session.user.id)
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    const status = commandManager.getStatus(session.user.id)

    return NextResponse.json({
      success: true,
      action,
      command: result.command ? {
        id: result.command.id,
        type: result.command.type,
        description: result.command.description,
        entityType: result.command.entityType,
        entityId: result.command.entityId,
      } : undefined,
      ...status,
    })
  } catch (error) {
    console.error('Error executing undo/redo:', error)
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 })
  }
}

// DELETE /api/undo-redo - Clear history
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    commandManager.clearHistory(session.user.id)

    return NextResponse.json({
      success: true,
      message: 'History cleared',
    })
  } catch (error) {
    console.error('Error clearing history:', error)
    return NextResponse.json({ error: 'Failed to clear history' }, { status: 500 })
  }
}
