/**
 * Single User API Routes
 * GET, PUT, DELETE for individual user management
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hash } from 'bcryptjs'

// GET /api/admin/users/[id] - Get single user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Users can view their own profile, admins can view all
    if (session.user.role !== 'ADMIN' && session.user.id !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id, isDeleted: false },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        department: true,
        phone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastLogin: true,
        twoFactorEnabled: true,
        notificationPreferences: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, user })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/users/[id] - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Only admins can update users (except own profile)
    if (session.user.role !== 'ADMIN' && session.user.id !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { fullName, role, department, phone, isActive, password, notificationPreferences } = body

    // Non-admins can only update certain fields of their own profile
    const updateData: any = {}

    if (session.user.role === 'ADMIN') {
      // Admins can update all fields
      if (fullName !== undefined) updateData.fullName = fullName
      if (role !== undefined) updateData.role = role
      if (department !== undefined) updateData.department = department
      if (phone !== undefined) updateData.phone = phone
      if (isActive !== undefined) updateData.isActive = isActive
      if (password) updateData.passwordHash = await hash(password, 12)
      if (notificationPreferences !== undefined) updateData.notificationPreferences = notificationPreferences
    } else {
      // Non-admins can only update their own profile fields
      if (fullName !== undefined) updateData.fullName = fullName
      if (phone !== undefined) updateData.phone = phone
      if (password) updateData.passwordHash = await hash(password, 12)
      if (notificationPreferences !== undefined) updateData.notificationPreferences = notificationPreferences
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        department: true,
        phone: true,
        isActive: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ success: true, user })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/users/[id] - Soft delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    // Prevent self-deletion
    if (session.user.id === id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    await prisma.user.update({
      where: { id },
      data: { isDeleted: true, isActive: false },
    })

    return NextResponse.json({ success: true, message: 'User deleted' })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}
