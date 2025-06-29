/// orchestrator/index.js
require('dotenv').config(); // Load environment variables (locally for testing, but does nothing in Cloud Run)
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const simpleGit = require('simple-git'); // For Git operations
const path = require('path');
const fs = require('fs/promises'); // Use fs.promises for async file operations
const { randomUUID } = require('crypto'); // For unique IDs

const app = express();
const port = process.env.PORT || 8080;

// --- Environment Variables & Client Initializations ---
// These read directly from process.env, which is what Cloud Run provides
const geminiApiKey = process.env.GEMINI_API_KEY;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const githubUsername = process.env.GITHUB_USERNAME;
const githubPat = process.env.GITHUB_PAT;
const vercelApiToken = process.env.VERCEL_API_TOKEN;
const vercelTeamId = process.env.VERCEL_TEAM_ID;
const vercelDomain = process.env.VERCEL_DOMAIN;
const boilerplateRepoUrl = process.env.BOILERPLATE_REPO_URL;
const boilerplateRepoBranch = process.env.BOILERPLATE_REPO_BRANCH || 'main';
const frontendUrl = process.env.FRONTEND_URL; // Explicitly get FRONTEND_URL here

// --- STARTUP LOGGING FOR DEBUGGING ---
console.log('Orchestrator Startup Diagnostics:');
console.log(`  PORT: ${port}`);
console.log(`  GEMINI_API_KEY_LOADED: ${!!geminiApiKey}`);
console.log(`  SUPABASE_URL_LOADED: ${!!supabaseUrl}`);
console.log(`  GITHUB_USERNAME_LOADED: ${!!githubUsername}`);
console.log(`  VERCEL_API_TOKEN_LOADED: ${!!vercelApiToken}`);
console.log(`  VERCEL_DOMAIN_LOADED: ${!!vercelDomain}`);
console.log(`  BOILERPLATE_REPO_URL_LOADED: ${!!boilerplateRepoUrl}`);
console.log(`  FRONTEND_URL (RAW from process.env): '${process.env.FRONTEND_URL}'`); // Raw value from environment
console.log(`  FRONTEND_URL (TRIMMED for CORS): '${frontendUrl ? frontendUrl.trim() : 'undefined/null'}'`); // Trimmed value
// --- END STARTUP LOGGING ---

// Validate essential environment variables
if (!geminiApiKey || !supabaseUrl || !supabaseServiceKey || !githubUsername || !githubPat || !vercelApiToken || !vercelDomain || !boilerplateRepoUrl || !frontendUrl) {
    console.error("CRITICAL ERROR: One or more essential environment variables are missing or undefined!");
    console.error("  Missing/Undefined variables details:");
    if (!geminiApiKey) console.error("    - GEMINI_API_KEY");
    if (!supabaseUrl) console.error("    - SUPABASE_URL");
    if (!supabaseServiceKey) console.error("    - SUPABASE_SERVICE_KEY");
    if (!githubUsername) console.error("    - GITHUB_USERNAME");
    if (!githubPat) console.error("    - GITHUB_PAT");
    if (!vercelApiToken) console.error("    - VERCEL_API_TOKEN");
    if (!vercelDomain) console.error("    - VERCEL_DOMAIN");
    if (!boilerplateRepoUrl) console.error("    - BOILERPLATE_REPO_URL");
    if (!frontendUrl) console.error("    - FRONTEND_URL");
    process.exit(1); // Force exit if critical variables are missing
}
console.log('All essential environment variables confirmed.');
console.log(`Orchestrator will allow CORS from: '${frontendUrl.trim()}'`); // Log the trimmed value that will be used for CORS

// Google Gemini
const genAI = new GoogleGenerativeAI(geminiApiKey);
const geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Supabase Client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

app.use(express.json());

// --- CRITICAL CORS CONFIGURATION ---
app.use(cors({
    origin: frontendUrl.trim(), // Use the trimmed value to prevent whitespace issues
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
}));
// --- END CRITICAL CORS CONFIGURATION ---


// --- Helper Functions ---
async function callVercelApi(endpoint, method = 'GET', body = null) {
    const headers = {
        'Authorization': `Bearer ${vercelApiToken}`,
        'Content-Type': 'application/json',
    };
    const url = `https://api.vercel.com${endpoint}`;
    console.log(`[Vercel API Call] Method: ${method}, Endpoint: ${url}`);
    if (body) {
        console.log(`[Vercel API Call] Body: ${JSON.stringify(body).substring(0, 200)}...`); // Log truncated body
    }

    const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });

    if (!res.ok) {
        const errorText = await res.text();
        console.error(`Vercel API Error (${endpoint}): ${res.status} ${res.statusText}`);
        console.error('Vercel Response Body:', errorText);
        throw new Error(`Vercel API call failed: ${res.statusText} - ${errorText}`);
    }
    const jsonResponse = await res.json();
    console.log(`[Vercel API Call] Success response: ${JSON.stringify(jsonResponse).substring(0, 200)}...`); // Log truncated response
    return jsonResponse;
}

// --- API Endpoints ---

// Main endpoint to generate code and trigger deployment
app.post('/generate-and-deploy', async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required.' });
    }

    const pageId = randomUUID(); // Generate a unique ID for this page
    const repoSlug = `ai-lp-${pageId.substring(0, 8)}`; // Short unique name for GitHub repo
    const githubRepoUrl = `https://github.com/${githubUsername}/${repoSlug}.git`;
    let deployedUrl = '';
    let vercelProjectId = '';
    let vercelDeploymentId = '';
    let generatedCode = ''; // To send back for Sandpack preview

    console.log(`[${pageId}] Initiating new generation for prompt: "${prompt.substring(0, 50)}..."`);

    // 1. Initial Supabase record (status: pending)
    try {
        const { data, error } = await supabase.from('generated_pages').insert({
            id: pageId,
            prompt: prompt,
            status: 'pending',
            github_repo_url: githubRepoUrl,
        }).select().single();
        if (error) throw error;
        console.log(`[${pageId}] Supabase record created. Status: pending.`);
    } catch (dbError) {
        console.error(`[${pageId}] ERROR: Supabase initial insert error:`, dbError);
        return res.status(500).json({ error: 'Could not create project record in database.' });
    }

    // Immediately respond to frontend with initial status and ID,
    // then perform heavy lifting asynchronously.
    res.status(202).json({
        id: pageId,
        status: 'accepted',
        message: 'Generation and deployment process initiated.',
        code: `// Please wait... AI is generating your code and deploying.
// This preview will update once code is generated.
// Your live URL will appear above this editor when deployment is complete.
// This process can take 1-3 minutes.
`
    });

    // --- ASYNCHRONOUS GENERATION & DEPLOYMENT PROCESS ---
    // This entire block runs in the background for Cloud Run, after initial response.
    (async () => {
        let tempDir; // Declare tempDir here so it's accessible in finally block
        try {
            // Update status in DB
            await supabase.from('generated_pages').update({ status: 'generating_code' }).eq('id', pageId);
            console.log(`[${pageId}] Status updated to generating_code.`);

            // 2. Generate React/TS/Tailwind Code with Gemini
            console.log(`[${pageId}] Calling Gemini API...`);
            const reactGenerationPrompt = `
Generate a single React TypeScript functional component for a landing page based on the following description.
The component should be named 'LandingPage' and exported as default.
It must use Tailwind CSS utility classes directly within the JSX for all styling. Do NOT use inline style objects or separate CSS files.
The page should be fully responsive using Tailwind's responsive prefixes (e.g., md:text-lg, lg:flex).
Include a clear, self-contained structure:
- A prominent hero section (with a headline, tagline, and a CTA button).
- At least 3 distinct feature sections/cards.
- A testimonials section (with 2-3 testimonials, each having a quote and author).
- A simple call-to-action (CTA) section at the bottom.
- Include Google Fonts imports (Montserrat for headings, Inter for body) via <link> tags in the component's render method, or in comments where they should be added in the HTML head if you prefer external loading.
- Use a coherent color palette based on the prompt (e.g., background, text, primary accent, secondary accent). Use Tailwind's default colors or extend them in comments within the JSX.
- Include placeholder content that matches the prompt but ensure it's diverse.
- Implement subtle animations (e.g., fade-in on scroll) using simple Tailwind classes if possible (e.g., animate-fade-in) or basic CSS transitions if necessary (but prefer Tailwind).

Do NOT include any external imports beyond 'react'.
Do NOT include 'tailwind.config.js' or <script src="https://cdn.tailwindcss.com"></script> within the generated component code. These will be provided by the boilerplate project.
Ensure all JSX is valid and all TypeScript types (like React.FC) are correctly used.
Output ONLY the TypeScript React component code, starting directly with 'import React from "react";' and ending with 'export default LandingPage;'. Do not include any surrounding markdown like \`\`\`tsx or any extra conversational text.

Description for the landing page: "${prompt}"
`;

            const result = await geminiModel.generateContent(reactGenerationPrompt);
            const response = await result.response;
            generatedCode = response.text().replace(/```tsx\s*|```/g, '').trim();

            if (!generatedCode.includes('import React from') || !generatedCode.includes('export default LandingPage')) {
                console.error(`[${pageId}] ERROR: Invalid AI-generated code structure. Starting with: ${generatedCode.substring(0, 100)}`);
                throw new Error('AI did not generate a valid React component named LandingPage. Check orchestrator logs for raw AI output.');
            }

            // Update DB with generated code for Sandpack preview
            await supabase.from('generated_pages').update({
                status: 'code_generated',
                generated_code: generatedCode
            }).eq('id', pageId);
            console.log(`[${pageId}] Code generated and saved to DB. Length: ${generatedCode.length} chars.`);


            // 3. Create GitHub Repo
            await supabase.from('generated_pages').update({ status: 'creating_repo' }).eq('id', pageId);
            console.log(`[${pageId}] Status updated to creating_repo.`);
            const createRepoBody = {
                name: repoSlug,
                private: true, // Keep client pages private
                description: `AI Generated Landing Page for prompt: "${prompt.substring(0, Math.min(prompt.length, 100))}"`,
            };
            try {
                const githubResponse = await fetch(`https://api.github.com/user/repos`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `token ${githubPat}`,
                        'Content-Type': 'application/json',
                        'User-Agent': githubUsername // GitHub API requires User-Agent
                    },
                    body: JSON.stringify(createRepoBody),
                });
                if (!githubResponse.ok) {
                    const githubErrorText = await githubResponse.text();
                    console.error(`[${pageId}] ERROR: GitHub repo creation failed: ${githubResponse.status} - ${githubErrorText}`);
                    throw new Error(`GitHub repo creation failed: ${githubResponse.status} - ${githubErrorText}`);
                }
                console.log(`[${pageId}] GitHub repo created: ${repoSlug}`);
            } catch (githubErr) {
                console.error(`[${pageId}] ERROR creating GitHub repo (network/API call issue):`, githubErr.message);
                throw new Error(`Failed to create GitHub repo: ${githubErr.message}`);
            }


            // 4. Clone Boilerplate, Inject Code, Push to new Repo
            await supabase.from('generated_pages').update({ status: 'pushing_code' }).eq('id', pageId);
            console.log(`[${pageId}] Status updated to pushing_code.`);

            tempDir = path.join('/tmp', pageId); // Use /tmp for Cloud Run ephemeral storage
            const localRepoPath = path.join(tempDir, repoSlug);

            try {
                // Configure git with a higher timeout for clone
                const git = simpleGit(); // Global instance for clone outside specific repo
                await fs.mkdir(tempDir, { recursive: true }); // Ensure parent dir exists
                console.log(`[${pageId}] Attempting to clone boilerplate from ${boilerplateRepoUrl} to ${localRepoPath}`);
                await git.clone(`https://${githubUsername}:${githubPat}@github.com/${githubUsername}/nextjs-lp-boilerplate.git`, localRepoPath, ['--branch', boilerplateRepoBranch]);
                console.log(`[${pageId}] Cloned boilerplate successfully.`);
            } catch (cloneErr) {
                console.error(`[${pageId}] ERROR cloning boilerplate:`, cloneErr.message);
                // Log git output if available
                if (cloneErr.stdout) console.error(`[${pageId}] Git stdout (clone):`, cloneErr.stdout.toString());
                if (cloneErr.stderr) console.error(`[${pageId}] Git stderr (clone):`, cloneErr.stderr.toString());
                throw new Error(`Failed to clone boilerplate repo: ${cloneErr.message}`);
            }

            try {
                // Overwrite the main page.tsx with AI-generated code
                const pageTsxPath = path.join(localRepoPath, 'src', 'app', 'page.tsx');
                console.log(`[${pageId}] Writing AI-generated code to: ${pageTsxPath}`);
                await fs.writeFile(pageTsxPath, generatedCode);
                console.log(`[${pageId}] Injected AI-generated code into page.tsx`);

                // Configure new repo git instance
                const newRepoGit = simpleGit({ baseDir: localRepoPath });
                await newRepoGit.addConfig('user.name', githubUsername);
                await newRepoGit.addConfig('user.email', `${githubUsername}@users.noreply.github.com`);
                await newRepoGit.add('.');
                console.log(`[${pageId}] Added files for commit.`);
                await newRepoGit.commit('feat: AI generated initial landing page code');
                console.log(`[${pageId}] Committing to local repo.`);

                console.log(`[${pageId}] Attempting to push code to: ${githubRepoUrl}`);
                await newRepoGit.push('origin', boilerplateRepoBranch, ['--force']); // --force to overwrite initial boilerplate branch if it was pushed empty
                console.log(`[${pageId}] Pushed AI-generated code to new GitHub repo successfully.`);

            } catch (pushErr) {
                console.error(`[${pageId}] ERROR during git push or local file operations:`, pushErr.message);
                // Log git output if available
                if (pushErr.stdout) console.error(`[${pageId}] Git stdout (push):`, pushErr.stdout.toString());
                if (pushErr.stderr) console.error(`[${pageId}] Git stderr (push):`, pushErr.stderr.toString());
                throw new Error(`Failed to push code to GitHub: ${pushErr.message}`);
            }


            // 5. Create Vercel Project & Trigger Deployment
            await supabase.from('generated_pages').update({ status: 'deploying' }).eq('id', pageId);
            console.log(`[${pageId}] Status updated to deploying.`);

            const vercelProjectBody = {
                name: repoSlug,
                gitRepository: {
                    type: 'github',
                    repo: `${githubUsername}/${repoSlug}`,
                },
                installCommand: 'npm install', // Standard Next.js
                buildCommand: 'npm run build', // Standard Next.js
                outputDirectory: '.next', // Default for Next.js App Router
                framework: 'nextjs',
                public: false, // Keep private
            };

            console.log(`[${pageId}] Calling Vercel API to create project: ${repoSlug}`);
            const vercelProject = await callVercelApi(
                `/v9/projects${vercelTeamId ? `?teamId=${vercelTeamId}` : ''}`,
                'POST',
                vercelProjectBody
            );
            vercelProjectId = vercelProject.id;
            console.log(`[${pageId}] Vercel Project created with ID: ${vercelProjectId}`);

            // 6. Add Custom Domain (Subdomain)
            const subdomain = repoSlug; // Use the repo name as subdomain for simplicity
            const fullDomain = `${subdomain}.${vercelDomain}`;

            const addDomainBody = {
                domain: fullDomain,
            };

            console.log(`[${pageId}] Calling Vercel API to add domain: ${fullDomain} to project ${vercelProjectId}`);
            await callVercelApi(
                `/v9/projects/${vercelProjectId}/domains${vercelTeamId ? `?teamId=${vercelTeamId}` : ''}`,
                'POST',
                addDomainBody
            );
            console.log(`[${pageId}] Added custom domain: ${fullDomain}`);

            // 7. Wait for Deployment to be READY
            let deploymentReady = false;
            let retries = 0;
            const maxRetries = 40; // Max 40 * 5s = 200 seconds (approx 3.3 minutes)
            console.log(`[${pageId}] Waiting for Vercel deployment of project ${vercelProjectId} to be READY...`);

            while (!deploymentReady && retries < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
                const deployments = await callVercelApi(
                    `/v6/deployments?projectId=${vercelProjectId}${vercelTeamId ? `&teamId=${vercelTeamId}` : ''}`
                );
                const latestDeployment = deployments.deployments[0]; // Get the most recent deployment

                if (latestDeployment) {
                    vercelDeploymentId = latestDeployment.uid;
                    console.log(`[${pageId}] Latest Vercel deployment status for ${vercelProjectId}: ${latestDeployment.state}`);
                    if (latestDeployment.state === 'READY' || latestDeployment.state === 'ERROR' || latestDeployment.state === 'CANCELED') {
                        deploymentReady = true;
                        if (latestDeployment.state === 'READY') {
                            deployedUrl = `https://${fullDomain}`; // Use the custom domain
                            console.log(`[${pageId}] Deployment READY! Final URL: ${deployedUrl}`);
                        } else {
                            // If build fails, try to fetch build logs from Vercel to help debug
                            let buildLogsUrl = `https://vercel.com/${githubUsername}/${repoSlug}/deployments/${latestDeployment.uid}`; // Assuming public project if you want direct link
                            if (vercelTeamId) {
                                buildLogsUrl = `https://vercel.com/${vercelTeamId}/${repoSlug}/deployments/${latestDeployment.uid}`;
                            }
                            console.error(`[${pageId}] Vercel deployment FAILED! Check logs at: ${buildLogsUrl}`);
                            throw new Error(`Vercel deployment failed with status: ${latestDeployment.state}. See Vercel logs.`);
                        }
                    }
                }
                retries++;
            }

            if (!deployedUrl) {
                throw new Error('Vercel deployment timed out or failed to find URL.');
            }

            // 8. Update Supabase record (status: deployed, add URL/IDs)
            await supabase.from('generated_pages').update({
                status: 'deployed',
                deployed_url: deployedUrl,
                vercel_project_id: vercelProjectId,
                vercel_deployment_id: vercelDeploymentId,
            }).eq('id', pageId);

            console.log(`[${pageId}] Page deployed successfully: ${deployedUrl}`);

        } catch (error) {
            console.error(`[${pageId}] Full generation/deployment process FAILED unexpectedly:`, error);
            await supabase.from('generated_pages').update({
                status: 'failed',
                message: error.message || 'Unknown error during deployment process. Check orchestrator logs.'
            }).eq('id', pageId);
        } finally {
            // Clean up temporary directory (important for Cloud Run ephemeral storage)
            if (tempDir && fs.rm) { // Check if tempDir was created and fs.rm exists
                await fs.rm(tempDir, { recursive: true, force: true }).catch(err => console.error(`[${pageId}] Failed to clean up temp dir ${tempDir}:`, err));
                console.log(`[${pageId}] Cleaned up temporary directory: ${tempDir}`);
            }
        }
    })();
});

// Endpoint to check deployment status (polled by frontend)
app.get('/status/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabase.from('generated_pages').select('*').eq('id', id).single();
        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Page not found.' });

        res.status(200).json({
            id: data.id,
            status: data.status,
            url: data.deployed_url,
            message: data.message, // For failed status
            generated_code: data.generated_code // Send code for Sandpack preview
        });
    } catch (dbError) {
        console.error(`[${id}] Supabase status fetch error:`, dbError);
        res.status(500).json({ error: 'Failed to retrieve status from database.' });
    }
});

app.get('/', (req, res) => {
    res.send('AI Page Factory Backend Orchestrator is running!');
});

app.listen(port, () => {
    console.log(`Orchestrator listening on port ${port}`);
});