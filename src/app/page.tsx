'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [syncStatus, setSyncStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSync = async () => {
    setIsLoading(true);
    setSyncStatus('Starting Google sync...');
    
    try {
      const response = await fetch('/api/connectors/google/sync', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSyncStatus('✅ Google sync started successfully! Check Supabase events table.');
      } else {
        setSyncStatus(`❌ Error: ${data.error || 'Sync failed'}`);
      }
    } catch (error) {
      setSyncStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotionSync = async () => {
    setIsLoading(true);
    setSyncStatus('Starting Notion sync...');
    
    try {
      const response = await fetch('/api/connectors/notion/sync', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSyncStatus('✅ Notion sync started successfully! Check Supabase tasks & documents tables.');
      } else {
        setSyncStatus(`❌ Error: ${data.error || 'Sync failed'}`);
      }
    } catch (error) {
      setSyncStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    setSyncStatus('Getting authorization URL...');
    
    try {
      const response = await fetch('/api/connectors/google/authorize');
      const data = await response.json();
      
      if (response.ok && data.authUrl) {
        setSyncStatus('Redirecting to Google...');
        window.location.href = data.authUrl;
      } else {
        setSyncStatus(`❌ Error: ${data.error || 'Failed to get auth URL'}`);
        setIsLoading(false);
      }
    } catch (error) {
      setSyncStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 items-center justify-center min-h-screen bg-zinc-50 font-sans dark:bg-black p-8">
      <main className="flex flex-col items-center justify-center gap-8 max-w-2xl w-full bg-white dark:bg-zinc-900 p-12 rounded-lg shadow-lg">
        <h1 className="text-4xl font-bold text-black dark:text-white">
          AURA - Google Calendar Sync
        </h1>
        
        <p className="text-lg text-zinc-600 dark:text-zinc-400 text-center">
          Test your Google Calendar integration by clicking the buttons below
        </p>

        <div className="flex flex-col gap-4 w-full max-w-md">
          <Link
            href="/dashboard"
            className="flex h-14 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-6 text-white font-semibold transition-all hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl"
          >
            📊 Open Dashboard
          </Link>

          <button
            onClick={handleGoogleAuth}
            disabled={isLoading}
            className="flex h-14 items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 text-white font-semibold transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading && syncStatus.includes('authorization') ? '⏳ Loading...' : '🔐 Authorize Google Calendar'}
          </button>

          <button
            onClick={handleGoogleSync}
            disabled={isLoading}
            className="flex h-14 items-center justify-center gap-2 rounded-lg bg-green-600 px-6 text-white font-semibold transition-colors hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading && syncStatus.includes('Google') ? '⏳ Syncing...' : '🔄 Sync Google Calendar'}
          </button>

          <button
            onClick={handleNotionSync}
            disabled={isLoading}
            className="flex h-14 items-center justify-center gap-2 rounded-lg bg-purple-600 px-6 text-white font-semibold transition-colors hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading && syncStatus.includes('Notion') ? '⏳ Syncing...' : '📝 Sync Notion'}
          </button>
        </div>

        {syncStatus && (
          <div className={`p-4 rounded-lg w-full max-w-md text-center ${
            syncStatus.includes('✅') 
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' 
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
          }`}>
            {syncStatus}
          </div>
        )}

        <div className="mt-8 p-6 bg-zinc-100 dark:bg-zinc-800 rounded-lg w-full max-w-md">
          <h2 className="text-xl font-semibold mb-4 text-black dark:text-white">Setup Checklist:</h2>
          <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
            <li>✅ Redis running: <code className="bg-zinc-200 dark:bg-zinc-700 px-2 py-1 rounded">npm run docker:up</code></li>
            <li>✅ Worker running: <code className="bg-zinc-200 dark:bg-zinc-700 px-2 py-1 rounded">npm run worker</code></li>
            <li>✅ App running: <code className="bg-zinc-200 dark:bg-zinc-700 px-2 py-1 rounded">npm run dev</code></li>
          </ul>
        </div>

        <div className="text-sm text-zinc-500 dark:text-zinc-500 text-center">
          After syncing, check your Supabase <code>public.events</code> table
        </div>
      </main>
    </div>
  );
}
