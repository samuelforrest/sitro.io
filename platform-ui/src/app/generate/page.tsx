'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, ExternalLink, Copy, Check, AlertCircle, Zap } from 'lucide-react'
import Link from 'next/link'

interface GenerateResponse {
  id: string;
  status: string;
  message: string;
  code?: string;
}

interface StatusResponse {
  id: string;
  status: string;
  url?: string;
  message?: string;
  generated_code?: string;
}

function GenerateContent() {
  const searchParams = useSearchParams()
  const prompt = searchParams?.get('prompt') || ''
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [deployedUrl, setDeployedUrl] = useState('')
  const [generationId, setGenerationId] = useState<string | null>(null)
  const [generationStatus, setGenerationStatus] = useState('')
  const [progress, setProgress] = useState(0)
  const [copied, setCopied] = useState(false)

  const getProgressValue = (status: string) => {
    const statusMap: { [key: string]: number } = {
      'accepted': 10,
      'generating_code': 30,
      'code_generated': 50,
      'deploying': 70,
      'deployed': 100,
      'failed': 0
    }
    return statusMap[status] || 0
  }

  const getStatusMessage = (status: string) => {
    const messageMap: { [key: string]: string } = {
      'accepted': 'Request accepted, starting generation...',
      'generating_code': 'AI is generating your code...',
      'code_generated': 'Code generated, preparing deployment...',
      'deploying': 'Deploying to cloud...',
      'deployed': 'Successfully deployed!',
      'failed': 'Generation failed'
    }
    return messageMap[status] || status.replace(/_/g, ' ')
  }

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return

    setIsLoading(true)
    setError('')
    setDeployedUrl('')
    setGenerationId(null)
    setProgress(0)

    let currentPollInterval: NodeJS.Timeout | null = null

    try {
      const backendApiUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:8080'

      // Step 1: Send prompt to backend
      const response = await fetch(`${backendApiUrl}/generate-and-deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Error: ${response.status} - ${errorData.error || 'Unknown error'}`)
      }

      const data: GenerateResponse = await response.json()
      setGenerationId(data.id)
      setGenerationStatus(data.message)
      setProgress(getProgressValue(data.status))

      // Step 2: Poll for status updates
      const pollStatus = async (id: string) => {
        try {
          const statusRes = await fetch(`${backendApiUrl}/status/${id}`)
          if (!statusRes.ok) {
            throw new Error(`Failed to fetch status: ${statusRes.status}`)
          }
          
          const statusData: StatusResponse = await statusRes.json()
          setGenerationStatus(getStatusMessage(statusData.status))
          setProgress(getProgressValue(statusData.status))

          if (statusData.status === 'deployed' && statusData.url) {
            setDeployedUrl(statusData.url)
            if (currentPollInterval) clearInterval(currentPollInterval)
            setIsLoading(false)
          } else if (statusData.status === 'failed') {
            setError(`Generation failed: ${statusData.message || 'Check logs for details'}`)
            if (currentPollInterval) clearInterval(currentPollInterval)
            setIsLoading(false)
          }
        } catch (pollErr) {
          console.error('Polling error:', pollErr)
          setError('Error checking status')
          if (currentPollInterval) clearInterval(currentPollInterval)
          setIsLoading(false)
        }
      }

      // Start polling
      currentPollInterval = setInterval(() => {
        if (data.id) {
          pollStatus(data.id)
        }
      }, 3000)

      // Timeout after 5 minutes
      setTimeout(() => {
        if (isLoading && !deployedUrl && !error) {
          setError('Generation timed out after 5 minutes')
          if (currentPollInterval) clearInterval(currentPollInterval)
          setIsLoading(false)
        }
      }, 300000)

    } catch (err) {
      console.error('Generation error:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      setIsLoading(false)
      if (currentPollInterval) clearInterval(currentPollInterval)
    }
  }, [prompt, deployedUrl, error, isLoading])

  useEffect(() => {
    if (prompt) {
      handleGenerate()
    }
  }, [prompt, handleGenerate])

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="space-y-10">
      {/* Prompt Display */}
      <Card className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-900">Your Request</CardTitle>
          <CardDescription className="text-lg text-gray-600">We&apos;re building this for you:</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl">
            <p className="text-gray-800 font-medium">
              &quot;{prompt}&quot;
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Status Card */}
      <Card className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-2xl font-bold text-gray-900">
            Generation Status
            {generationId && (
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                ID: {generationId}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between text-lg font-medium">
              <span className="text-gray-700">{generationStatus}</span>
              <span className="text-blue-600">{progress}%</span>
            </div>
            <Progress value={progress} className="w-full h-3" />
          </div>

          {error && (
            <div className="flex flex-col items-center justify-center text-center py-6">
              <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-red-600 mb-2">Generation Failed!</h3>
              <p className="text-red-500">{error}</p>
            </div>
          )}

          {deployedUrl && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Check className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-3xl font-black text-gray-900 mb-2">
                Your website is live! 🎉
              </h3>
              <p className="text-lg text-gray-600 mb-6">
                Your AI-generated website is ready and deployed
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <a
                  href={deployedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-xl font-semibold text-blue-600 hover:text-purple-600 underline break-all transition-colors"
                >
                  <span>{deployedUrl}</span>
                  <ExternalLink className="ml-2 w-5 h-5" />
                </a>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(deployedUrl)}
                  className="border-2 border-gray-300 hover:bg-gray-50 rounded-lg"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Retry Button */}
      {(error || deployedUrl) && (
        <div className="text-center">
          <Button 
            onClick={handleGenerate} 
            disabled={isLoading}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl px-8 py-3 font-semibold shadow-lg"
          >
            Generate Again
          </Button>
        </div>
      )}
    </div>
  )
}

export default function GeneratePage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Navigation - matching wizard page */}
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
            <Link href="/" className="flex items-center space-x-2 bg-white border-2 border-gray-300 text-gray-900 hover:bg-gray-50 shadow-lg px-4 py-2 rounded-lg transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </nav>

      <main className="px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black mb-4 leading-tight tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              AI Generation
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 font-medium">
              Watch your website come to life in real-time
            </p>
          </div>

          <Suspense fallback={
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Zap className="w-8 h-8 text-white animate-spin" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading...</h2>
                <p className="text-gray-600">Preparing your generation workspace</p>
              </div>
            </div>
          }>
            <GenerateContent />
          </Suspense>
        </div>
      </main>
    </div>
  )
}
