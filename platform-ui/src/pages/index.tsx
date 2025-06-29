// platform-ui/src/pages/index.tsx
import Head from 'next/head';
import { useRouter } from 'next/router'; // Ensure useRouter is imported
import React, { useState } from 'react';
import CodeEditorAndPreview from '../components/CodeEditorAndPreview'; // Correct import path

// Define interfaces for expected API responses for better TypeScript
interface GenerateResponse {
  id: string;
  status: string; // e.g., 'accepted'
  message: string;
  code?: string; // Optional field for initial code (if backend sends it immediately)
}

interface StatusResponse {
  id: string;
  status: string; // e.g., 'generating_code', 'deployed', 'failed'
  url?: string; // Final deployed URL
  message?: string; // Error message if failed
  generated_code?: string; // The generated TSX code for Sandpack
}

export default function HomePage() {
  const router = useRouter(); // Initialize router hook
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [generatedCode, setGeneratedCode] = useState<string>(''); // For Sandpack
  const [deployedUrl, setDeployedUrl] = useState<string>('');
  const [generationId, setGenerationId] = useState<string | null>(null); // State to hold the ID
  const [generationStatus, setGenerationStatus] = useState<string>(''); // For displaying detailed status

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      setError('Please enter a description for your landing page.');
      return;
    }

    // Reset state for new generation
    setIsLoading(true);
    setError('');
    setGeneratedCode('');
    setDeployedUrl('');
    setGenerationId(null); // Clear ID
    setGenerationStatus('Initiating generation process...'); // Initial status message

    let currentPollInterval: NodeJS.Timeout | null = null; // To hold the interval ID

    try {
      const backendApiUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL;
      if (!backendApiUrl) {
        throw new Error('Backend API URL is not configured. Please set NEXT_PUBLIC_BACKEND_API_URL in .env.local and redeploy.');
      }

      // Step 1: Send prompt to backend Orchestrator
      const response = await fetch(backendApiUrl + '/generate-and-deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Error: ${response.status} - ${errorData.error || 'Unknown error during backend processing'}`);
      }

      const data: GenerateResponse = await response.json(); // Cast the response data
      setGenerationId(data.id); // Store the unique ID for polling
      setGenerationStatus(data.message); // Initial message from backend

      // If backend immediately returns generated code (e.g., for Sandpack preview)
      if (data.code) {
        setGeneratedCode(data.code);
      }

      // Step 2: Poll backend for detailed status updates
      // Using a closure to capture generationId correctly for the interval
      const pollPageStatus = async (currentGenerationId: string) => {
        try {
          const statusRes = await fetch(`${backendApiUrl}/status/${currentGenerationId}`);
          if (!statusRes.ok) {
            throw new Error(`Failed to fetch status: ${statusRes.status}`);
          }
          const statusData: StatusResponse = await statusRes.json(); // Cast status data

          // Update general status message
          setGenerationStatus(statusData.status.replace(/_/g, ' ') + '...');

          // Update Sandpack preview if generated code becomes available during polling
          if (statusData.generated_code && statusData.generated_code !== generatedCode) {
            setGeneratedCode(statusData.generated_code);
          }

          // Check for final states
          if (statusData.status === 'deployed' && statusData.url) {
            setDeployedUrl(statusData.url);
            if (currentPollInterval) clearInterval(currentPollInterval); // Stop polling
            setIsLoading(false); // End loading
          } else if (statusData.status === 'failed') {
            setError(`Deployment failed: ${statusData.message || 'Check backend logs for details.'}`);
            if (currentPollInterval) clearInterval(currentPollInterval); // Stop polling
            setIsLoading(false); // End loading
          }
        } catch (pollErr: unknown) { // Use unknown for caught error
          console.error('Polling error:', pollErr);
          if (pollErr instanceof Error) {
            setError('Error checking deployment status: ' + pollErr.message);
          } else {
            setError('Error checking deployment status.');
          }
          if (currentPollInterval) clearInterval(currentPollInterval); // Stop polling
          setIsLoading(false); // End loading
        }
      };

      // Start polling after the first successful response
      currentPollInterval = setInterval(() => {
        if (data.id) { // Ensure data.id exists before starting polling
            pollPageStatus(data.id);
        }
      }, 5000); // Poll every 5 seconds

      // Optional: Add a robust timeout for the entire polling process
      const timeoutId = setTimeout(() => {
        if (isLoading && !deployedUrl && !error) { // If still loading and no error/URL after timeout
          setError("Generation/Deployment timed out after 5 minutes. Please check Cloud Run/Vercel logs for more details.");
          if (currentPollInterval) clearInterval(currentPollInterval); // Ensure interval is cleared
          setIsLoading(false);
        }
      }, 1000 * 60 * 5); // 5 minutes timeout

      // Cleanup on component unmount or new submission
      const cleanupOnExit = () => {
        if (currentPollInterval) clearInterval(currentPollInterval);
        clearTimeout(timeoutId);
      }
      // Use router.events for navigation changes to clean up intervals
      router.events.on('routeChangeStart', cleanupOnExit);

      // Return a cleanup function for useEffect if this were inside a useEffect,
      // but here it's tied to the handleSubmit lifecycle.
      // Make sure to clean up the interval when generation finishes or fails.
      // This is handled by clearInterval in success/fail paths.

    } catch (err: unknown) { // Use unknown for caught error
      console.error('Frontend encountered error during generation/deployment initiation:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
      setIsLoading(false);
      // Ensure interval is cleared on initial error as well
      if (currentPollInterval) clearInterval(currentPollInterval);
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
          Describe your business, desired style, and content. We&apos;ll craft the React/TypeScript code and deploy it to a unique URL.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <textarea
            style={styles.textarea}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="E.g., &apos;A modern, clean, light-themed landing page for a coffee shop. Include a hero section with a large image and headline, a menu with 3-4 items, and a contact form. Use subtle animations. Primary color: deep brown (#4A2A0D), Accent: cream (#F5F5DC). Fonts: Playfair Display (serif) for headings, Roboto (sans-serif) for body. Make it a single functional component called LandingPage.&apos;"
            rows={8}
            disabled={isLoading}
          ></textarea>
          <button type="submit" style={styles.button} disabled={isLoading}>
            {isLoading ? `Generating & Deploying (${generationStatus})...` : 'Generate & Deploy'}
          </button>
          {error && <p style={styles.errorText}>{error}</p>}
        </form>

        {isLoading && !deployedUrl && !error && (
          <p style={styles.loadingMessage}>{generationStatus} {generationId ? `(ID: ${generationId})` : ''}</p>
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

        {/* Render CodeEditorAndPreview only if generatedCode is available */}
        {generatedCode && <CodeEditorAndPreview codeContent={generatedCode} />}
      </main>
    </div>
  );
}

// Styles for platform UI (same as before)
const styles = {
  container: { 
    minHeight: '100vh', 
    padding: '0 0.5rem', 
    display: 'flex' as const, 
    flexDirection: 'column' as const, 
    justifyContent: 'center' as const, 
    alignItems: 'center' as const, 
    backgroundColor: '#0d0d15', 
    color: '#f0f0f0' 
  },
  main: { 
    padding: '5rem 0', 
    flex: '1', 
    display: 'flex' as const, 
    flexDirection: 'column' as const, 
    justifyContent: 'center' as const, 
    alignItems: 'center' as const, 
    width: '90%', 
    maxWidth: '1000px' 
  },
  title: { 
    fontSize: '3.5rem', 
    fontWeight: '700', 
    marginBottom: '1rem', 
    textAlign: 'center' as const 
  },
  gradientText: { 
    background: 'linear-gradient(to right, #ffffff, #00CCFF)', 
    WebkitBackgroundClip: 'text', 
    WebkitTextFillColor: 'transparent' 
  },
  description: { 
    fontSize: '1.2rem', 
    color: '#b0b0b0', 
    textAlign: 'center' as const, 
    marginBottom: '2rem' 
  },
  form: { 
    display: 'flex' as const, 
    flexDirection: 'column' as const, 
    width: '100%', 
    maxWidth: '800px', 
    backgroundColor: '#1f1f30', 
    padding: '2rem', 
    borderRadius: '12px', 
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)', 
    border: '1px solid #333355' 
  },
  textarea: { 
    width: '100%', 
    padding: '1rem', 
    marginBottom: '1.5rem', 
    borderRadius: '8px', 
    border: '1px solid #333355', 
    backgroundColor: '#2a2a3d', 
    color: '#f0f0f0', 
    fontSize: '1rem', 
    fontFamily: "'Inter', sans-serif", 
    resize: 'vertical' as const, 
    minHeight: '180px' 
  },
  button: { 
    padding: '1rem 1.5rem', 
    fontSize: '1.1rem', 
    fontWeight: '700', 
    fontFamily: "'Orbitron', sans-serif", 
    backgroundColor: '#00CCFF', 
    color: '#0d0d15', 
    border: 'none', 
    borderRadius: '8px', 
    cursor: 'pointer', 
    transition: 'background-color 0.3s ease, transform 0.3s ease', 
    boxShadow: '0 6px 20px rgba(0, 204, 255, 0.4)' 
  },
  errorText: { 
    color: 'red', 
    marginTop: '1rem', 
    textAlign: 'center' as const 
  },
  loadingMessage: { 
    fontSize: '1.3rem', 
    color: '#00CCFF', 
    marginTop: '2rem', 
    textAlign: 'center' as const 
  },
  deployedUrlBox: { 
    backgroundColor: '#1f1f30', 
    padding: '2rem', 
    borderRadius: '12px', 
    boxShadow: '0 8px 30px rgba(0,0,0,0.4)', 
    border: '1px solid #00CCFF', 
    marginTop: '2rem', 
    textAlign: 'center' as const, 
    width: '100%', 
    maxWidth: '800px' 
  },
  deployedUrlText: { 
    fontSize: '1.5rem', 
    fontWeight: 'bold', 
    color: '#00CCFF', 
    marginBottom: '1rem' 
  },
  deployedUrlLink: { 
    fontSize: '1.2rem', 
    color: '#FF00FF', 
    wordBreak: 'break-all' as const, 
    textDecoration: 'underline' 
  },
  deployedUrlSubtext: { 
    fontSize: '0.9rem', 
    color: '#b0b0b0', 
    marginTop: '0.5rem' 
  }
};