/**
 * Undo/Redo System - Command Pattern Implementation
 * Provides reversible operations for critical data changes
 */

export interface Command<T = unknown> {
  id: string
  type: string
  description: string
  timestamp: Date
  userId: string
  entityType: string
  entityId: string
  execute: () => Promise<T>
  undo: () => Promise<T>
  beforeState: unknown
  afterState?: unknown
}

export interface CommandHistory {
  commands: Command[]
  currentIndex: number
  maxHistory: number
}

class CommandManager {
  private static instance: CommandManager
  private histories: Map<string, CommandHistory> = new Map()
  private readonly DEFAULT_MAX_HISTORY = 50

  private constructor() {}

  static getInstance(): CommandManager {
    if (!CommandManager.instance) {
      CommandManager.instance = new CommandManager()
    }
    return CommandManager.instance
  }

  /**
   * Get or create history for a user session
   */
  private getHistory(userId: string): CommandHistory {
    if (!this.histories.has(userId)) {
      this.histories.set(userId, {
        commands: [],
        currentIndex: -1,
        maxHistory: this.DEFAULT_MAX_HISTORY,
      })
    }
    return this.histories.get(userId)!
  }

  /**
   * Execute a command and add it to history
   */
  async execute<T>(command: Command<T>): Promise<T> {
    const history = this.getHistory(command.userId)

    // Execute the command
    const result = await command.execute()
    command.afterState = result

    // Remove any commands after current index (redo stack)
    history.commands = history.commands.slice(0, history.currentIndex + 1)

    // Add command to history
    history.commands.push(command)
    history.currentIndex++

    // Trim history if it exceeds max
    if (history.commands.length > history.maxHistory) {
      history.commands.shift()
      history.currentIndex--
    }

    return result
  }

  /**
   * Undo the last command
   */
  async undo(userId: string): Promise<{ success: boolean; command?: Command; error?: string }> {
    const history = this.getHistory(userId)

    if (history.currentIndex < 0) {
      return { success: false, error: 'Nothing to undo' }
    }

    const command = history.commands[history.currentIndex]

    try {
      await command.undo()
      history.currentIndex--
      return { success: true, command }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Undo failed'
      }
    }
  }

  /**
   * Redo the last undone command
   */
  async redo(userId: string): Promise<{ success: boolean; command?: Command; error?: string }> {
    const history = this.getHistory(userId)

    if (history.currentIndex >= history.commands.length - 1) {
      return { success: false, error: 'Nothing to redo' }
    }

    const command = history.commands[history.currentIndex + 1]

    try {
      await command.execute()
      history.currentIndex++
      return { success: true, command }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Redo failed'
      }
    }
  }

  /**
   * Get undo/redo status for a user
   */
  getStatus(userId: string): { canUndo: boolean; canRedo: boolean; undoDescription?: string; redoDescription?: string } {
    const history = this.getHistory(userId)

    const canUndo = history.currentIndex >= 0
    const canRedo = history.currentIndex < history.commands.length - 1

    return {
      canUndo,
      canRedo,
      undoDescription: canUndo ? history.commands[history.currentIndex].description : undefined,
      redoDescription: canRedo ? history.commands[history.currentIndex + 1].description : undefined,
    }
  }

  /**
   * Get command history for a user
   */
  getCommandHistory(userId: string, limit = 10): Command[] {
    const history = this.getHistory(userId)
    return history.commands.slice(-limit)
  }

  /**
   * Clear history for a user
   */
  clearHistory(userId: string): void {
    this.histories.delete(userId)
  }
}

export const commandManager = CommandManager.getInstance()

// Command factory functions for common operations
export function createUpdateCommand<T>(params: {
  userId: string
  entityType: string
  entityId: string
  description: string
  beforeState: T
  updateFn: () => Promise<T>
  revertFn: (beforeState: T) => Promise<T>
}): Command<T> {
  return {
    id: crypto.randomUUID(),
    type: 'UPDATE',
    description: params.description,
    timestamp: new Date(),
    userId: params.userId,
    entityType: params.entityType,
    entityId: params.entityId,
    beforeState: params.beforeState,
    execute: params.updateFn,
    undo: () => params.revertFn(params.beforeState),
  }
}

export function createDeleteCommand<T>(params: {
  userId: string
  entityType: string
  entityId: string
  description: string
  beforeState: T
  deleteFn: () => Promise<T>
  restoreFn: (beforeState: T) => Promise<T>
}): Command<T> {
  return {
    id: crypto.randomUUID(),
    type: 'DELETE',
    description: params.description,
    timestamp: new Date(),
    userId: params.userId,
    entityType: params.entityType,
    entityId: params.entityId,
    beforeState: params.beforeState,
    execute: params.deleteFn,
    undo: () => params.restoreFn(params.beforeState),
  }
}

export function createCreateCommand<T>(params: {
  userId: string
  entityType: string
  entityId: string
  description: string
  createFn: () => Promise<T>
  deleteFn: () => Promise<T>
}): Command<T> {
  return {
    id: crypto.randomUUID(),
    type: 'CREATE',
    description: params.description,
    timestamp: new Date(),
    userId: params.userId,
    entityType: params.entityType,
    entityId: params.entityId,
    beforeState: null,
    execute: params.createFn,
    undo: params.deleteFn,
  }
}
