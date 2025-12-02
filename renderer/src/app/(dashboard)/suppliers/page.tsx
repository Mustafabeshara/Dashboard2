'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus, Building } from 'lucide-react'

export default function SuppliersPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Suppliers</h1>
          <p className="text-muted-foreground">Manage your supplier relationships</p>
        </div>
        <Button asChild>
          <Link href="/suppliers/create">
            <Plus className="mr-2 h-4 w-4" />
            Add Supplier
          </Link>
        </Button>
      </div>
      <p className="text-center py-12">Suppliers module - Full implementation in progress</p>
    </div>
  )
}
