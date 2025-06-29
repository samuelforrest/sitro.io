// platform-ui/src/pages/index.tsx
import Head from 'next/head';
import React, { useState } from 'react';
import CodeEditorAndPreview from '../components/CodeEditorAndPreview';

export default function HomePage() {
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [generatedCode, setGeneratedCode] = useState<string>(''); // For Sandpack
  const [deployedUrl, setDeployedUrl] = useState<string>('');
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      setError('Please enter a description for your landing page.');
      return;
    }

    setIsLoading(true);
    setError('');
    setGeneratedCode(''); // Clear previous generation
    setDeployedUrl('');
    setGenerationId(null);
    setGenerationStatus('Initiating generation...');

    try {
      const backendApiUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL;
      if (!backendApiUrl) {
        throw new Error('Backend API URL is not configured. Please set NEXT_PUBLIC_BACKEND_API_URL in .env.local and redeploy.');
      }

      // Step 1: Request code generation and deployment trigger from backend
      const response = await fetch(backendApiUrl + '/generate-and-deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Error: ${response.status} - ${errorData.error || 'Unknown error during backend processing'}`);
      }

      const data = await response.json();
      setGenerationId(data.id); // Store ID for status polling
      setGenerationStatus(data.message); // Initial message from backend

      // If backend immediately returns generated code (e.g., for Sandpack preview)
      if (data.code) {
        setGeneratedCode(data.code);
      }

      // Step 2: Poll backend for deployment status
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(`${backendApiUrl}/status/${data.id}`);
          if (!statusRes.ok) {
            throw new Error(`Failed to fetch status: ${statusRes.status}`);
          }
          const statusData = await statusRes.json();
          setGenerationStatus(statusData.status.replace(/_/g, ' ') + '...'); // Update status message

          if (statusData.status === 'deployed' && statusData.url) {
            setDeployedUrl(statusData.url);
            clearInterval(pollInterval);
            setIsLoading(false);
          } else if (statusData.status === 'failed') {
            setError(`Deployment failed: ${statusData.message || 'Check backend logs.'}`);
            clearInterval(pollInterval);
            setIsLoading(false);
          } else if (statusData.status === 'code_generated' && statusData.generated_code && !generatedCode) {
            // Update Sandpack preview if code comes in a later poll
            setGeneratedCode(statusData.generated_code);
          }
        } catch (pollErr: any) {
          console.error('Polling error:', pollErr);
          setError('Error checking deployment status.');
          clearInterval(pollInterval);
          setIsLoading(false);
        }
      }, 5000); // Poll every 5 seconds
      // Optional: Add a timeout for the entire polling process
      setTimeout(() => {
        if (isLoading && !deployedUrl && !error) {
          setError("Deployment taking longer than expected. Check Vercel/Cloud Run logs.");
          clearInterval(pollInterval);
          setIsLoading(false);
        }
      }, 1000 * 60 * 5); // 5 minutes timeout
    } catch (err: any) {
      console.error('Failed to generate and deploy:', err);
      setError(err.message || 'An unexpected error occurred during generation and deployment.');
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <Head>
        <title>AI React Page Factory</title>
        <meta name="description" content="Generate, deploy, and own custom React/TypeScript landing pages instantly." />
      </Head>

      <main style={styles.main}>
        <h1 style={styles.title}>
          Your <span style={styles.gradientText}>AI Page Factory</span>
        </h1>
        <p style={styles.description}>
          Describe your business, desired style, and content. We'll craft the React/TypeScript code and deploy it to a unique URL.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <textarea
            style={styles.textarea}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="E.g., 'A modern, clean, light-themed landing page for a coffee shop. Include a hero section with a large image and headline, a menu with 3-4 items, and a contact form. Use subtle animations. Primary color: deep brown (#4A2A0D), Accent: cream (#F5F5DC). Fonts: Playfair Display (serif) for headings, Roboto (sans-serif) for body. Make it a single functional component called LandingPage.'"
            rows={8}
            disabled={isLoading}
          ></textarea>
          <button type="submit" style={styles.button} disabled={isLoading}>
            {isLoading ? `Generating & Deploying (${generationStatus})...` : 'Generate & Deploy'}
          </button>
          {error && <p style={styles.errorText}>{error}</p>}
        </form>

        {isLoading && !deployedUrl && !error && (
          <p style={styles.loadingMessage}>{generationStatus}</p>
        )}

        {deployedUrl && (
          <div style={styles.deployedUrlBox}>
            <p style={styles.deployedUrlText}>Your page is live! 🎉</p>
            <a href={deployedUrl} target="_blank" rel="noopener noreferrer" style={styles.deployedUrlLink}>
              {deployedUrl}
            </a>
            <p style={styles.deployedUrlSubtext}>Preview your code below if you want to inspect it.</p>
          </div>
        )}

        {generatedCode && <CodeEditorAndPreview codeContent={generatedCode} />}
      </main>
    </div>
  );
}

// Styles for platform UI
const styles = {
  container: { minHeight: '100vh', padding: '0 0.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#0d0d15', color: '#f0f0f0', },
  main: { padding: '5rem 0', flex: '1', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: '90%', maxWidth: '1000px', },
  title: { fontSize: '3.5rem', fontWeight: '700', marginBottom: '1rem', textAlign: 'center', },
  gradientText: { background: 'linear-gradient(to right, #ffffff, #00CCFF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', },
  description: { fontSize: '1.2rem', color: '#b0b0b0', textAlign: 'center', marginBottom: '2rem', },
  form: { display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '800px', backgroundColor: '#1f1f30', padding: '2rem', borderRadius: '12px', boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)', border: '1px solid #333355', },
  textarea: { width: '100%', padding: '1rem', marginBottom: '1.5rem', borderRadius: '8px', border: '1px solid #333355', backgroundColor: '#2a2a3d', color: '#f0f0f0', fontSize: '1rem', fontFamily: "'Inter', sans-serif", resize: 'vertical', minHeight: '180px', },
  button: { padding: '1rem 1.5rem', fontSize: '1.1rem', fontWeight: '700', fontFamily: "'Orbitron', sans-serif", backgroundColor: '#00CCFF', color: '#0d0d15', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background-color 0.3s ease, transform 0.3s ease', boxShadow: '0 6px 20px rgba(0, 204, 255, 0.4)', },
  errorText: { color: 'red', marginTop: '1rem', textAlign: 'center', },
  loadingMessage: { fontSize: '1.3rem', color: '#00CCFF', marginTop: '2rem', textAlign: 'center' },
  deployedUrlBox: { backgroundColor: '#1f1f30', padding: '2rem', borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.4)', border: '1px solid #00CCFF', marginTop: '2rem', textAlign: 'center', width: '100%', maxWidth: '800px' },
  deployedUrlText: { fontSize: '1.5rem', fontWeight: 'bold', color: '#00CCFF', marginBottom: '1rem' },
  deployedUrlLink: { fontSize: '1.2rem', color: '#FF00FF', wordBreak: 'break-all', textDecoration: 'underline' },
  deployedUrlSubtext: { fontSize: '0.9rem', color: '#b0b0b0', marginTop: '0.5rem' }
};