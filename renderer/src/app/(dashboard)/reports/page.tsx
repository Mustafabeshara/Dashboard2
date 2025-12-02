'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FileText } from 'lucide-react'

export default function ReportsPage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Reports</h1>
      <p className="text-muted-foreground">Generate business insights and analytics</p>
      <div className="mt-8 text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
        <p className="mt-4">Reports module - Full implementation in progress</p>
      </div>
    </div>
  )
}
