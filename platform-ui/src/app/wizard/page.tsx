'use client'

import { useSearchParams } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import CodeEditorAndPreview from '@/components/CodeEditorAndPreview';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Zap, ExternalLink, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Suspense } from 'react';

// Define interfaces for expected API responses for better TypeScript

interface StatusResponse {
  id: string;
  status: string; // e.g., 'generating_code', 'deployed', 'failed'
  url?: string; // Final deployed URL
  message?: string; // Error message if failed
  generated_code?: string; // The generated TSX code for Sandpack
}

function WizardContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const generationIdFromUrl = searchParams?.get('id') // Get ID from URL query parameters

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [generatedCode, setGeneratedCode] = useState<string>(''); // For Sandpack
  const [deployedUrl, setDeployedUrl] = useState<string>('');
  const [generationId, setGenerationId] = useState<string | null>(null); // State to hold the ID
  const [generationStatus, setGenerationStatus] = useState<string>('Initializing...'); // For displaying detailed status

  // Use a ref to hold the interval ID to ensure it's always up-to-date in closures
  const pollIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const timeoutIdRef = React.useRef<NodeJS.Timeout | null>(null);

  const pollPageStatus = React.useCallback(async (currentGenerationId: string) => {
    try {
      const backendApiUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL;
      if (!backendApiUrl) {
        throw new Error('Backend API URL is not configured. Please set NEXT_PUBLIC_BACKEND_API_URL in .env.local and redeploy.');
      }

      const statusRes = await fetch(`${backendApiUrl}/status/${currentGenerationId}`);
      if (!statusRes.ok) {
        throw new Error(`Failed to fetch status: ${statusRes.status}`);
      }
      const statusData: StatusResponse = await statusRes.json();

      setGenerationStatus(statusData.status.replace(/_/g, ' ') + '...');

      if (statusData.generated_code && statusData.generated_code !== generatedCode) {
        setGeneratedCode(statusData.generated_code);
      }

      if (statusData.status === 'deployed' && statusData.url) {
        setDeployedUrl(statusData.url);
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
        setIsLoading(false);
      } else if (statusData.status === 'failed') {
        setError(`Deployment failed: ${statusData.message || 'Check backend logs for details.'}`);
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
        setIsLoading(false);
      }
    } catch (pollErr: unknown) {
      console.error('Polling error:', pollErr);
      if (pollErr instanceof Error) {
        setError('Error checking deployment status: ' + pollErr.message);
      } else {
        setError('Error checking deployment status.');
      }
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
      setIsLoading(false);
    }
  }, [generatedCode]); // Include generatedCode in dependencies to avoid stale closures with its state

  useEffect(() => {
    if (generationIdFromUrl && typeof generationIdFromUrl === 'string') {
      setGenerationId(generationIdFromUrl);
      setIsLoading(true);
      setError('');
      setGeneratedCode('');
      setDeployedUrl('');
      setGenerationStatus('Starting generation and deployment...');

      // Initial poll immediately
      pollPageStatus(generationIdFromUrl);

      // Start polling interval
      pollIntervalRef.current = setInterval(() => {
        pollPageStatus(generationIdFromUrl);
      }, 5000); // Poll every 5 seconds

      // Set overall timeout
      timeoutIdRef.current = setTimeout(() => {
        if (isLoading && !deployedUrl && !error) {
          setError("Generation/Deployment timed out after 5 minutes. Please check Cloud Run/Vercel logs for more details.");
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setIsLoading(false);
        }
      }, 1000 * 60 * 5); // 5 minutes timeout

    } else {
      // No ID in URL, redirect or show error
      setError('No generation ID provided. Please return to the homepage.');
      setIsLoading(false);
    }

    // Cleanup function for useEffect
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
    };
  }, [generationIdFromUrl, pollPageStatus, deployedUrl, error, isLoading]); // Add necessary dependencies

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-gray-100 flex flex-col items-center py-12 px-4">
      <main className="w-full max-w-6xl mx-auto space-y-10">
        <h1 className="text-5xl md:text-6xl font-extrabold text-center mb-8 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          Your AI Landing Page
        </h1>

        <Card className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg">
          <CardContent className="space-y-4">
            {isLoading && !error && (
              <div className="flex flex-col items-center justify-center text-center py-8">
                <Clock className="w-12 h-12 text-blue-400 animate-spin mb-4" />
                <p className="text-xl font-semibold text-blue-300">
                  {generationStatus}
                </p>
                {generationId && <p className="text-sm text-gray-400 mt-2">Generation ID: {generationId}</p>}
                <p className="text-md text-gray-500 mt-4">This process can take up to 5 minutes...</p>
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center justify-center text-center py-8">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <p className="text-xl font-semibold text-red-400">
                  Generation Failed!
                </p>
                <p className="text-md text-red-300 mt-2">{error}</p>
                <Button 
                  onClick={() => router.push('/')} 
                  className="mt-6 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white rounded-lg px-6 py-3 font-semibold"
                >
                  Go Back Home
                </Button>
              </div>
            )}

            {deployedUrl && (
              <div className="text-center py-8">
                <p className="text-2xl font-bold text-green-400 mb-4 flex items-center justify-center">
                  <Zap className="w-8 h-8 mr-2" /> Your Page is Live! 🎉
                </p>
                <a 
                  href={deployedUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-lg md:text-xl text-purple-400 hover:text-purple-300 underline break-all flex items-center justify-center transition-colors"
                >
                  {deployedUrl} <ExternalLink className="ml-2 w-5 h-5" />
                </a>
                <p className="text-gray-500 mt-4">
                  (Click the link above to view your deployed page)
                </p>
                <Button 
                  onClick={() => router.push('/')} 
                  className="mt-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg px-6 py-3 font-semibold"
                >
                  Create Another Page
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {generatedCode && (
          <Card className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg">
            <CardContent>
              <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-yellow-300 to-orange-400 bg-clip-text text-transparent">
                Generated Code Preview
              </h2>
              <p className="text-gray-400 mb-6">
                This is the raw TSX code generated by the AI for your page.
              </p>
              {/* Ensure CodeEditorAndPreview is correctly imported and its styles/dependencies are met */}
              <CodeEditorAndPreview codeContent={generatedCode} />
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

export default function WizardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-gray-100 flex items-center justify-center">Loading...</div>}>
      <WizardContent />
    </Suspense>
  );
}