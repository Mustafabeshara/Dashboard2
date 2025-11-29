'use client';

import { useState, useEffect } from 'react';
import { LocalDatabaseProvider, useLocalDatabase, useCompanies, useSyncStatus } from '@/hooks/database';

function DatabaseTestContent() {
  const { isConnected, isElectron, error, refreshAll } = useLocalDatabase();
  const { companies, createCompany, deleteCompany } = useCompanies();
  const { syncStatus, getQueueStats } = useSyncStatus();
  const [queueStats, setQueueStats] = useState<any>(null);
  const [testLog, setTestLog] = useState<string[]>([]);
  const [newCompanyName, setNewCompanyName] = useState('');

  const log = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestLog(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  useEffect(() => {
    if (isConnected) {
      log('✅ Connected to local database');
      loadQueueStats();
    } else if (error) {
      log(`❌ Error: ${error}`);
    }
  }, [isConnected, error]);

  const loadQueueStats = async () => {
    try {
      const stats = await getQueueStats();
      setQueueStats(stats);
    } catch (err) {
      console.error('Failed to load queue stats:', err);
    }
  };

  const handleCreateCompany = async () => {
    if (!newCompanyName.trim()) return;
    
    try {
      log(`Creating company: ${newCompanyName}...`);
      const company = await createCompany({
        name: newCompanyName,
        type: 'manufacturer',
        country: 'Kuwait'
      });
      log(`✅ Created company: ${company.name} (ID: ${company.id})`);
      setNewCompanyName('');
      await loadQueueStats();
    } catch (err: any) {
      log(`❌ Failed to create company: ${err.message}`);
    }
  };

  const handleDeleteCompany = async (id: string, name: string) => {
    try {
      log(`Deleting company: ${name}...`);
      await deleteCompany(id);
      log(`✅ Deleted company: ${name}`);
      await loadQueueStats();
    } catch (err: any) {
      log(`❌ Failed to delete company: ${err.message}`);
    }
  };

  const handleRefresh = async () => {
    log('Refreshing all data...');
    await refreshAll();
    await loadQueueStats();
    log('✅ Data refreshed');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-blue-400 mb-2">
            🗄️ Local Database Test
          </h1>
          <p className="text-gray-400">
            Medical Distribution Dashboard - Electron + SQLite
          </p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Connection Status */}
          <div className={`p-6 rounded-xl ${isConnected ? 'bg-green-900/30 border border-green-500' : 'bg-red-900/30 border border-red-500'}`}>
            <h2 className="text-lg font-semibold mb-2">Connection</h2>
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
            <p className="text-sm text-gray-400 mt-2">
              Environment: {isElectron ? 'Electron' : 'Browser'}
            </p>
          </div>

          {/* Sync Status */}
          <div className="p-6 rounded-xl bg-blue-900/30 border border-blue-500">
            <h2 className="text-lg font-semibold mb-2">Sync Status</h2>
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${syncStatus.isOnline ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
              <span>{syncStatus.isOnline ? 'Online' : 'Offline'}</span>
            </div>
            <p className="text-sm text-gray-400 mt-2">
              Pending changes: {syncStatus.pendingChanges}
            </p>
          </div>

          {/* Queue Stats */}
          <div className="p-6 rounded-xl bg-purple-900/30 border border-purple-500">
            <h2 className="text-lg font-semibold mb-2">Offline Queue</h2>
            {queueStats ? (
              <div className="space-y-1 text-sm">
                <p>Pending: <span className="text-yellow-400">{queueStats.pending}</span></p>
                <p>Processing: <span className="text-blue-400">{queueStats.processing}</span></p>
                <p>Completed: <span className="text-green-400">{queueStats.completed}</span></p>
                <p>Failed: <span className="text-red-400">{queueStats.failed}</span></p>
              </div>
            ) : (
              <p className="text-gray-400">Loading...</p>
            )}
          </div>
        </div>

        {/* Company Management */}
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Companies ({companies.length})</h2>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm"
            >
              🔄 Refresh
            </button>
          </div>

          {/* Add Company */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)}
              placeholder="Enter company name..."
              className="flex-1 px-4 py-2 bg-gray-700 rounded-lg text-white placeholder-gray-400"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateCompany()}
            />
            <button
              onClick={handleCreateCompany}
              disabled={!newCompanyName.trim() || !isConnected}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg"
            >
              ➕ Add
            </button>
          </div>

          {/* Company List */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {companies.length === 0 ? (
              <p className="text-gray-400 text-center py-4">No companies yet. Add one above!</p>
            ) : (
              companies.map((company) => (
                <div
                  key={company.id}
                  className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
                >
                  <div>
                    <span className="font-medium">{company.name}</span>
                    <span className="ml-2 text-xs text-gray-400">({company.type})</span>
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded ${
                      company.syncStatus === 'synced' ? 'bg-green-800 text-green-200' :
                      company.syncStatus === 'pending' ? 'bg-yellow-800 text-yellow-200' :
                      'bg-gray-600 text-gray-300'
                    }`}>
                      {company.syncStatus}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteCompany(company.id, company.name)}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
                  >
                    🗑️
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Activity Log */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">Activity Log</h2>
          <div className="bg-black rounded-lg p-4 h-48 overflow-y-auto font-mono text-sm">
            {testLog.length === 0 ? (
              <p className="text-gray-500">Waiting for activity...</p>
            ) : (
              testLog.map((entry, i) => (
                <div key={i} className="text-gray-300">{entry}</div>
              ))
            )}
          </div>
        </div>

        {/* Not in Electron Warning */}
        {!isElectron && (
          <div className="bg-yellow-900/30 border border-yellow-500 rounded-xl p-6 text-center">
            <h3 className="text-lg font-semibold text-yellow-400 mb-2">⚠️ Browser Mode</h3>
            <p className="text-gray-300">
              You are viewing this in a browser. To test the local database, run the Electron app:
            </p>
            <code className="block mt-2 p-2 bg-black rounded text-green-400">
              npx electron .
            </code>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DatabaseTestPage() {
  return (
    <LocalDatabaseProvider>
      <DatabaseTestContent />
    </LocalDatabaseProvider>
  );
}
