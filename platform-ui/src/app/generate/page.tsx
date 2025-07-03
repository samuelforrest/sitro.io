'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, ExternalLink, Copy, Check, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import CodeEditorAndPreview from '@/components/CodeEditorAndPreview'

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
  const [generatedCode, setGeneratedCode] = useState('')
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
    setGeneratedCode('')
    setDeployedUrl('')
    setGenerationId(null)
    setProgress(0)

    let currentPollInterval: NodeJS.Timeout | null = null

    try {
      const backendApiUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:3001'

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

      if (data.code) {
        setGeneratedCode(data.code)
      }

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

          if (statusData.generated_code && statusData.generated_code !== generatedCode) {
            setGeneratedCode(statusData.generated_code)
          }

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
  }, [prompt, generatedCode, deployedUrl, error, isLoading])

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
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Prompt Display */}
        <Card>
          <CardHeader>
            <CardTitle>Your Request</CardTitle>
            <CardDescription>We&apos;re building this for you:</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm bg-slate-100 dark:bg-slate-800 p-3 rounded-lg">
              &quot;{prompt}&quot;
            </p>
          </CardContent>
        </Card>

        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Generation Status
              {generationId && (
                <Badge variant="outline" className="text-xs">
                  ID: {generationId}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{generationStatus}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>

            {error && (
              <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {deployedUrl && (
              <div className="space-y-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center space-x-2 text-green-800 dark:text-green-200">
                  <Check className="w-5 h-5" />
                  <span className="font-medium">Your website is live!</span>
                </div>
                <div className="flex items-center space-x-2">
                  <a
                    href={deployedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 underline flex items-center space-x-1"
                  >
                    <span>{deployedUrl}</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(deployedUrl)}
                    className="h-8"
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Code Preview */}
        {generatedCode && (
          <Card>
            <CardHeader>
              <CardTitle>Code Preview</CardTitle>
              <CardDescription>
                Preview and edit your generated code below
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeEditorAndPreview codeContent={generatedCode} />
            </CardContent>
          </Card>
        )}

        {/* Retry Button */}
        {(error || deployedUrl) && (
          <div className="text-center">
            <Button onClick={handleGenerate} disabled={isLoading}>
              Generate Again
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function GeneratePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-slate-950/80">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Fluc</span>
          </Link>
        </div>
      </header>

      <Suspense fallback={<div className="container mx-auto px-4 py-8 text-center">Loading...</div>}>
        <GenerateContent />
      </Suspense>
    </div>
  )
}
