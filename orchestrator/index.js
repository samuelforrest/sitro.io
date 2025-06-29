// orchestrator/index.js
require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const simpleGit = require('simple-git'); // For Git operations
const path = require('path');
const fs = require('fs/promises'); // Use fs.promises for async file operations
const { randomUUID } = require('crypto'); // For unique IDs
const { Buffer } = require('buffer'); // For Vercel API response parsing

const app = express();
const port = process.env.PORT || 8080;

// --- Environment Variables & Client Initializations ---
const geminiApiKey = process.env.GEMINI_API_KEY;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const githubUsername = process.env.GITHUB_USERNAME;
const githubPat = process.env.GITHUB_PAT;
const vercelApiToken = process.env.VERCEL_API_TOKEN;
const vercelTeamId = process.env.VERCEL_TEAM_ID; // Optional
const vercelDomain = process.env.VERCEL_DOMAIN;
const boilerplateRepoUrl = process.env.BOILERPLATE_REPO_URL;
const boilerplateRepoBranch = process.env.BOILERPLATE_REPO_BRANCH || 'main';

// Validate essential environment variables
if (!geminiApiKey || !supabaseUrl || !supabaseServiceKey || !githubUsername || !githubPat || !vercelApiToken || !vercelDomain || !boilerplateRepoUrl) {
    console.error("Missing essential environment variables!");
    process.exit(1);
}

// Google Gemini
const genAI = new GoogleGenerativeAI(geminiApiKey);
const geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Supabase Client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

app.use(express.json());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000', // Allow requests from your frontend
}));

// --- Helper Functions ---

// Simplified fetch for Vercel API that handles streaming body response
async function callVercelApi(endpoint, method = 'GET', body = null) {
    const headers = {
        'Authorization': `Bearer ${vercelApiToken}`,
        'Content-Type': 'application/json',
    };
    const url = `https://api.vercel.com${endpoint}`;
    const options = { method, headers };
    if (body) {
        options.body = JSON.stringify(body);
    }
    const res = await fetch(url, options);

    if (!res.ok) {
        const errorText = await res.text();
        console.error(`Vercel API Error (${endpoint}): ${res.status} ${res.statusText}`);
        console.error('Vercel Response Body:', errorText);
        throw new Error(`Vercel API call failed: ${res.statusText} - ${errorText}`);
    }
    return res.json(); // Use .json() directly as Vercel APIs usually return JSON
}

// --- API Endpoints ---

// Main endpoint to generate code and trigger deployment
app.post('/generate-and-deploy', async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required.' });
    }

    const pageId = randomUUID(); // Generate a unique ID for this page
    const repoSlug = `ai-lp-${pageId.substring(0, 8)}`; // Short unique name for GitHub repo and Vercel project
    const githubRepoUrl = `https://github.com/${githubUsername}/${repoSlug}.git`;
    let deployedUrl = '';
    let vercelProjectId = '';
    let vercelDeploymentId = '';
    let generatedCode = ''; // To send back for Sandpack preview

    // 1. Initial Supabase record (status: pending)
    try {
        const { data, error } = await supabase.from('generated_pages').insert({
            id: pageId,
            prompt: prompt,
            status: 'pending',
            github_repo_url: githubRepoUrl,
        }).select().single();
        if (error) throw error;
        // pageId is now confirmed from DB, if gen_random_uuid() was used
    } catch (dbError) {
        console.error('Supabase initial insert error:', dbError);
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
        let tempDir;
        try {
            // Update status in DB
            await supabase.from('generated_pages').update({ status: 'generating_code' }).eq('id', pageId);

            // 2. Generate React/TS/Tailwind Code with Gemini
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
- Include placeholder content that matches the prompt's theme but is diverse.
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
                throw new Error('AI did not generate a valid React component named LandingPage.');
            }

            // Update DB with generated code for Sandpack preview
            await supabase.from('generated_pages').update({
                status: 'code_generated',
                generated_code: generatedCode
            }).eq('id', pageId);
            console.log(`Code generated for page ${pageId}`);

            // 3. Create GitHub Repo
            await supabase.from('generated_pages').update({ status: 'creating_repo' }).eq('id', pageId);
            const createRepoBody = {
                name: repoSlug,
                private: true, // Keep client pages private
                description: `AI Generated Landing Page for prompt: "${prompt.substring(0, Math.min(prompt.length, 100))}"`,
            };
            await fetch(`https://api.github.com/user/repos`, {
                method: 'POST',
                headers: {
                    'Authorization': `token ${githubPat}`,
                    'Content-Type': 'application/json',
                    'User-Agent': githubUsername // GitHub API requires User-Agent
                },
                body: JSON.stringify(createRepoBody),
            });
            console.log(`GitHub repo created: ${repoSlug}`);

            // 4. Clone Boilerplate, Inject Code, Push to new Repo
            await supabase.from('generated_pages').update({ status: 'pushing_code' }).eq('id', pageId);

            tempDir = path.join('/tmp', pageId); // Use /tmp for Cloud Run ephemeral storage
            const localRepoPath = path.join(tempDir, repoSlug);

            // Clone boilerplate
            await fs.mkdir(tempDir, { recursive: true }); // Ensure parent dir exists
            await simpleGit().clone(`https://${githubUsername}:${githubPat}@github.com/${githubUsername}/nextjs-lp-boilerplate.git`, localRepoPath, ['--branch', boilerplateRepoBranch]);
            console.log(`Cloned boilerplate to ${localRepoPath}`);

            // Overwrite the main page.tsx with AI-generated code
            await fs.writeFile(path.join(localRepoPath, 'src', 'app', 'page.tsx'), generatedCode);
            console.log('Injected AI-generated code into page.tsx');

            // Configure new repo git
            const newRepoGit = simpleGit({ baseDir: localRepoPath });
            await newRepoGit.addConfig('user.name', githubUsername);
            await newRepoGit.addConfig('user.email', `${githubUsername}@users.noreply.github.com`);
            await newRepoGit.add('.');
            await newRepoGit.commit('feat: AI generated initial landing page code');
            await newRepoGit.push('origin', boilerplateRepoBranch, ['--force']); // --force to overwrite initial boilerplate branch if it was pushed empty
            console.log('Pushed AI-generated code to new GitHub repo');

            // 5. Create Vercel Project & Trigger Deployment
            await supabase.from('generated_pages').update({ status: 'deploying' }).eq('id', pageId);

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
                // For custom domains / subdomains, Vercel connects automatically via Git if the domain is verified.
                // We ensure it gets the desired domain later.
            };

            const vercelProject = await callVercelApi(
                `/v9/projects${vercelTeamId ? `?teamId=${vercelTeamId}` : ''}`,
                'POST',
                vercelProjectBody
            );
            vercelProjectId = vercelProject.id;
            console.log(`Vercel Project created: ${vercelProjectId}`);

            // 6. Add Custom Domain (Subdomain)
            const subdomain = repoSlug; // Use the repo name as subdomain for simplicity
            const fullDomain = `${subdomain}.${vercelDomain}`;

            const addDomainBody = {
                domain: fullDomain,
                // Vercel handles DNS verification automatically if domain is managed by them.
                // Or if wildcard is set up.
            };

            await callVercelApi(
                `/v9/projects/${vercelProjectId}/domains${vercelTeamId ? `?teamId=${vercelTeamId}` : ''}`,
                'POST',
                addDomainBody
            );
            console.log(`Added custom domain: ${fullDomain}`);

            // 7. Wait for Deployment to be READY
            let deploymentReady = false;
            let retries = 0;
            const maxRetries = 40; // Max 40 * 5s = 200 seconds (approx 3.3 minutes)

            while (!deploymentReady && retries < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
                const deployments = await callVercelApi(
                    `/v6/deployments?projectId=${vercelProjectId}${vercelTeamId ? `&teamId=${vercelTeamId}` : ''}`
                );
                const latestDeployment = deployments.deployments[0]; // Get the most recent deployment

                if (latestDeployment) {
                    vercelDeploymentId = latestDeployment.uid;
                    console.log(`Latest deployment status for ${vercelProjectId}: ${latestDeployment.state}`);
                    if (latestDeployment.state === 'READY' || latestDeployment.state === 'ERROR' || latestDeployment.state === 'CANCELED') {
                        deploymentReady = true;
                        if (latestDeployment.state === 'READY') {
                            deployedUrl = `https://${fullDomain}`; // Use the custom domain
                            console.log(`Deployment READY: ${deployedUrl}`);
                        } else {
                            throw new Error(`Vercel deployment failed with status: ${latestDeployment.state}`);
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

            console.log(`Page deployed successfully: ${deployedUrl}`);

        } catch (error) {
            console.error('Full generation/deployment process failed:', error);
            await supabase.from('generated_pages').update({
                status: 'failed',
                message: error.message || 'Unknown error during deployment process.'
            }).eq('id', pageId);
        } finally {
            // Clean up temporary directory (important for Cloud Run ephemeral storage)
            if (tempDir && fs.rm) { // Check if tempDir was created and fs.rm exists
                await fs.rm(tempDir, { recursive: true, force: true }).catch(err => console.error('Failed to clean up temp dir:', err));
                console.log(`Cleaned up temporary directory: ${tempDir}`);
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
        console.error('Supabase status fetch error:', dbError);
        res.status(500).json({ error: 'Failed to retrieve status from database.' });
    }
});

app.get('/', (req, res) => {
    res.send('AI Page Factory Backend Orchestrator is running!');
});

app.listen(port, () => {
    console.log(`Orchestrator listening on port ${port}`);
});