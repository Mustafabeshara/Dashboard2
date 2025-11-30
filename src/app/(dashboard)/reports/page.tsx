'use client'
import Link from 'next/link'
export default function ReportsPage() {
  return (<div className="p-8"><div className="max-w-2xl mx-auto text-center"><div className="text-6xl mb-4">📊</div><h1 className="text-3xl font-bold text-gray-800 mb-4">Reports</h1><p className="text-gray-600 mb-8">This module is under development.</p><Link href="/dashboard" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">← Back to Dashboard</Link></div></div>)
}
