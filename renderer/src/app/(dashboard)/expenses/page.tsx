/**
 * Expenses List Page
 */
'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default function ExpensesPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Expenses</h1>
        <Button asChild>
          <Link href="/expenses/create">
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </Link>
        </Button>
      </div>
      <p>Expenses module - Implementation in progress</p>
    </div>
  )
}
