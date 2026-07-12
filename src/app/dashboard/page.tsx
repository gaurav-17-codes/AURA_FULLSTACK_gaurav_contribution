'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Event {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  attendees: any[];
  source: string;
}

interface Message {
  id: string;
  sender: string;
  subject: string;
  snippet: string;
  flagged: boolean;
  source: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  due_date: string;
  source: string;
}

interface Document {
  id: string;
  title: string;
  url: string;
  last_modified: string;
  source: string;
}

interface SyncJob {
  id: string;
  connector: string;
  status: string;
  items_synced: number;
  started_at: string;
  completed_at: string;
}

interface DashboardData {
  events: Event[];
  messages: Message[];
  tasks: Task[];
  documents: Document[];
  syncJobs: SyncJob[];
  stats: {
    totalEvents: number;
    totalMessages: number;
    totalTasks: number;
    totalDocuments: number;
  };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/dashboard');
      const data = await response.json();
      setData(data);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (connector: 'google' | 'notion') => {
    setSyncing(true);
    setSyncMessage(`Syncing ${connector}...`);
    
    try {
      const response = await fetch(`/api/connectors/${connector}/sync`, {
        method: 'POST',
      });
      
      if (response.ok) {
        setSyncMessage(`✅ ${connector} synced! Refreshing...`);
        setTimeout(() => {
          fetchDashboard();
          setSyncMessage('');
        }, 2000);
      } else {
        setSyncMessage(`❌ ${connector} sync failed`);
      }
    } catch (error) {
      setSyncMessage(`❌ Error: ${error}`);
    } finally {
      setSyncing(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center">
        <div className="text-2xl text-zinc-600 dark:text-zinc-400">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-black dark:text-white mb-2">
              Today
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          
          <div className="flex gap-2">
            <Link
              href="/"
              className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 text-black dark:text-white rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
            >
              ← Home
            </Link>
            <button
              onClick={() => handleSync('google')}
              disabled={syncing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              🔄 Sync Google
            </button>
            <button
              onClick={() => handleSync('notion')}
              disabled={syncing}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              🔄 Sync Notion
            </button>
          </div>
        </div>

        {syncMessage && (
          <div className="mt-4 p-4 bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 rounded-lg">
            {syncMessage}
          </div>
        )}

        {/* Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-sm">
            <div className="text-3xl font-bold text-blue-600">{data?.stats.totalEvents || 0}</div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">Events</div>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-sm">
            <div className="text-3xl font-bold text-green-600">{data?.stats.totalMessages || 0}</div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">Messages</div>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-sm">
            <div className="text-3xl font-bold text-purple-600">{data?.stats.totalTasks || 0}</div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">Tasks</div>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-sm">
            <div className="text-3xl font-bold text-orange-600">{data?.stats.totalDocuments || 0}</div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">Documents</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Events - Takes 2 columns */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm p-6">
            <h2 className="text-2xl font-semibold text-black dark:text-white mb-4 flex items-center gap-2">
              📅 Calendar Events
              <span className="text-sm text-zinc-500 dark:text-zinc-400 font-normal">
                (Next 7 days)
              </span>
            </h2>
            
            {data?.events && data.events.length > 0 ? (
              <div className="space-y-3">
                {data.events.map((event) => (
                  <div
                    key={event.id}
                    className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-black dark:text-white">
                          {event.title}
                        </h3>
                        <div className="flex gap-4 mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                          <span>🕐 {formatTime(event.start_time)}</span>
                          <span>📆 {formatDate(event.start_time)}</span>
                          {event.attendees && event.attendees.length > 0 && (
                            <span>👥 {event.attendees.length} attendees</span>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
                        {event.source}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-zinc-500 dark:text-zinc-500">
                No events found. Click "Sync Google" to fetch your calendar events.
              </div>
            )}
          </div>
        </div>

        {/* Tasks */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-2xl font-semibold text-black dark:text-white mb-4">
              ✅ Tasks
            </h2>
            
            {data?.tasks && data.tasks.length > 0 ? (
              <div className="space-y-3">
                {data.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <h3 className="font-medium text-black dark:text-white text-sm">
                      {task.title}
                    </h3>
                    <div className="flex gap-2 mt-2 text-xs">
                      {task.status && (
                        <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 px-2 py-1 rounded">
                          {task.status}
                        </span>
                      )}
                      {task.due_date && (
                        <span className="text-zinc-500 dark:text-zinc-400">
                          Due: {formatDate(task.due_date)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-zinc-500 dark:text-zinc-500 text-sm">
                No tasks. Sync Notion to see your tasks here.
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm p-6">
            <h2 className="text-2xl font-semibold text-black dark:text-white mb-4">
              ✉️ Messages
            </h2>
            
            {data?.messages && data.messages.length > 0 ? (
              <div className="space-y-3">
                {data.messages.slice(0, 5).map((message) => (
                  <div
                    key={message.id}
                    className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      {message.flagged && <span className="text-yellow-500">⭐</span>}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-zinc-600 dark:text-zinc-400 truncate">
                          {message.sender}
                        </div>
                        <h3 className="font-medium text-black dark:text-white text-sm truncate">
                          {message.subject || '(No subject)'}
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1 line-clamp-2">
                          {message.snippet}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-zinc-500 dark:text-zinc-500 text-sm">
                No messages found.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sync Status */}
      {data?.syncJobs && data.syncJobs.length > 0 && (
        <div className="max-w-7xl mx-auto mt-6">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-black dark:text-white mb-4">
              🔄 Recent Syncs
            </h2>
            <div className="space-y-2">
              {data.syncJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex justify-between items-center text-sm border-b border-zinc-200 dark:border-zinc-800 py-2 last:border-0"
                >
                  <div className="flex gap-3 items-center">
                    <span className="font-medium text-black dark:text-white capitalize">
                      {job.connector}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      job.status === 'completed' 
                        ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100'
                        : job.status === 'failed'
                        ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100'
                        : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100'
                    }`}>
                      {job.status}
                    </span>
                    {job.status === 'completed' && (
                      <span className="text-zinc-600 dark:text-zinc-400">
                        {job.items_synced} items
                      </span>
                    )}
                  </div>
                  <span className="text-zinc-500 dark:text-zinc-500 text-xs">
                    {new Date(job.started_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
