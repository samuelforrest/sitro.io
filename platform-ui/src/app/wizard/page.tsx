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
    <div className="min-h-screen bg-white text-gray-900">
      {/* Navigation - matching main page */}
      <nav className="sticky top-0 z-50 px-6 py-4 backdrop-blur-md border-b bg-white/80 border-gray-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Fluc.io
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button 
              onClick={() => router.push('/')} 
              className="bg-white border-2 border-gray-300 text-gray-900 hover:bg-gray-50 shadow-lg px-4 py-2 rounded-lg"
            >
              ← Back to Home
            </Button>
          </div>
        </div>
      </nav>

      <main className="px-6 py-12">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="text-center mb-8">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black mb-4 leading-tight tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Your AI Landing Page
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 font-medium">
              Watch your website come to life in real-time
            </p>
          </div>

          <Card className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardContent className="space-y-6">
              {isLoading && !error && (
                <div className="flex flex-col items-center justify-center text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                    <Clock className="w-8 h-8 text-white animate-spin" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {generationStatus}
                  </h3>
                  {generationId && <p className="text-sm text-gray-500 mb-4">Generation ID: {generationId}</p>}
                  <p className="text-lg text-gray-600 max-w-md">This process can take up to 5 minutes. We&apos;re working hard to bring your vision to life!</p>
                </div>
              )}

              {error && (
                <div className="flex flex-col items-center justify-center text-center py-12">
                  <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-6">
                    <AlertCircle className="w-8 h-8 text-red-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-red-600 mb-2">
                    Generation Failed!
                  </h3>
                  <p className="text-lg text-red-500 mb-6 max-w-md">{error}</p>
                  <Button 
                    onClick={() => router.push('/')} 
                    className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white rounded-xl px-8 py-3 font-semibold shadow-lg"
                  >
                    Go Back Home
                  </Button>
                </div>
              )}

              {deployedUrl && (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <Zap className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-3xl font-black text-gray-900 mb-2">
                    Your Page is Live! 🎉
                  </h3>
                  <p className="text-lg text-gray-600 mb-6">
                    Your AI-generated website is ready and deployed
                  </p>
                  <a 
                    href={deployedUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="inline-flex items-center text-xl font-semibold text-blue-600 hover:text-purple-600 underline break-all transition-colors mb-6"
                  >
                    {deployedUrl} <ExternalLink className="ml-2 w-5 h-5" />
                  </a>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button 
                      onClick={() => window.open(deployedUrl, '_blank')}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl px-8 py-3 font-semibold shadow-lg"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Live Site
                    </Button>
                    <Button 
                      onClick={() => router.push('/')} 
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl px-8 py-3 font-semibold shadow-lg"
                    >
                      Create Another Page
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {generatedCode && (
            <Card className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300">
              <CardContent>
                <div className="text-center mb-8">
                  <h2 className="text-4xl font-black mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Generated Code Preview
                  </h2>
                  <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                    This is the raw TSX code generated by our AI for your website. You can preview it live below.
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <CodeEditorAndPreview codeContent={generatedCode} />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

export default function WizardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Clock className="w-8 h-8 text-white animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading...</h2>
          <p className="text-gray-600">Preparing your AI workspace</p>
        </div>
      </div>
    }>
      <WizardContent />
    </Suspense>
  );
}