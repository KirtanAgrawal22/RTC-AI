"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CodeEditor } from '@/components/CodeEditor';
import { CustomWhiteboard } from '@/components/CustomWhiteboard';
import { getDataFromUrl, isShareUrl } from '@/lib/shareUtils';
import VideoCall from '@/components/VideoCall';

interface SharedData {
  code: string;
  language: string;
  drawing?: any;
  timestamp: number;
  version: string;
}

export default function SharePage() {
  const [sharedData, setSharedData] = useState<SharedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [roomId, setRoomId] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    // Only run on client
    if (typeof window !== 'undefined' && isShareUrl()) {
      const data = getDataFromUrl();
      if (data) {
        setSharedData(data);
        // Extract roomId from URL or use a hash of the data
        const slug = window.location.pathname.split('/share/')[1];
        setRoomId(slug || `room-${data.timestamp}`);
      } else {
        // Invalid share link, redirect to home
        router.push('/');
      }
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading shared content...</div>
      </div>
    );
  }

  if (!sharedData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Invalid share link</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Shared Content</h1>
            <p className="text-gray-400">
              Shared {new Date(sharedData.timestamp).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Create New
          </button>
        </div>
      </header>

      <main className="p-4">
        {sharedData.code && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Code</h2>
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <div className="p-3 bg-gray-700">
                <span className="text-sm text-gray-300">
                  Language: {sharedData.language.toUpperCase()}
                </span>
              </div>
              <pre className="p-4 overflow-auto max-h-96">
                {sharedData.code}
              </pre>
            </div>
          </div>
        )}

        {sharedData.drawing && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Drawing</h2>
            <div className="bg-white rounded-lg overflow-hidden">
              <img
                src={sharedData.drawing.dataURL}
                alt="Shared drawing"
                className="w-full max-w-2xl mx-auto"
              />
            </div>
          </div>
        )}
      </main>
      <VideoCall roomId={roomId} />  
    </div>
  );
}
