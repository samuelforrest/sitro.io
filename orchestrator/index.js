// orchestrator/index.js
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
const geminiApiKey = process.env.GEMINI_API_KEY;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // This is your service_role key
const githubUsername = process.env.GITHUB_USERNAME;
const githubPat = process.env.GITHUB_PAT;
const vercelApiToken = process.env.VERCEL_API_TOKEN;
const vercelTeamId = process.env.VERCEL_TEAM_ID;
const vercelDomain = process.env.VERCEL_DOMAIN;
const boilerplateRepoUrl = process.env.BOILERPLATE_REPO_URL;
const boilerplateRepoBranch = process.env.BOILERPLATE_REPO_BRANCH || 'main';
const frontendUrl = process.env.FRONTEND_URL;

// --- STARTUP LOGGING FOR DEBUGGING ---
console.log('Orchestrator Startup Diagnostics:');
console.log(`  PORT: ${port}`);
console.log(`  GEMINI_API_KEY_LOADED: ${!!geminiApiKey}`);
console.log(`  SUPABASE_URL_LOADED: ${!!supabaseUrl}`);
console.log(`  SUPABASE_SERVICE_KEY (RAW): '${process.env.SUPABASE_SERVICE_KEY}'`);
console.log(`  SUPABASE_SERVICE_KEY (LENGTH): ${process.env.SUPABASE_SERVICE_KEY ? process.env.SUPABASE_SERVICE_KEY.length : 'N/A'}`);
console.log(`  SUPABASE_SERVICE_KEY (TRIMMED LENGTH): ${process.env.SUPABASE_SERVICE_KEY ? process.env.SUPABASE_SERVICE_KEY.trim().length : 'N/A'}`);
console.log(`  SUPABASE_SERVICE_KEY (CHAR 0): ${process.env.SUPABASE_SERVICE_KEY ? process.env.SUPABASE_SERVICE_KEY[0] : 'N/A'}`);
console.log(`  SUPABASE_SERVICE_KEY (CHAR LAST): ${process.env.SUPABASE_SERVICE_KEY ? process.env.SUPABASE_SERVICE_KEY[process.env.SUPABASE_SERVICE_KEY.length - 1] : 'N/A'}`);
console.log(`  GITHUB_USERNAME_LOADED: ${!!githubUsername}`);
console.log(`  VERCEL_API_TOKEN_LOADED: ${!!vercelApiToken}`);
console.log(`  VERCEL_DOMAIN_LOADED: ${!!vercelDomain}`);
console.log(`  BOILERPLATE_REPO_URL_LOADED: ${!!boilerplateRepoUrl}`);
console.log(`  FRONTEND_URL (RAW from process.env): '${process.env.FRONTEND_URL}'`);
console.log(`  FRONTEND_URL (TRIMMED for CORS): '${frontendUrl ? frontendUrl.trim() : 'undefined/null'}'`);
// --- END STARTUP LOGGING ---

// Validate essential environment variables
if (!geminiApiKey || !supabaseUrl || !supabaseServiceKey || !githubUsername || !githubPat || !vercelApiToken || !vercelDomain || !boilerplateRepoUrl || !frontendUrl) {
    console.error("CRITICAL ERROR: One or more essential environment variables are missing or undefined!");
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
console.log(`Orchestrator will allow CORS from: '${frontendUrl.trim()}'`);

// Google Gemini
const genAI = new GoogleGenerativeAI(geminiApiKey);
const geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Supabase Client (Using the configuration that you stated "works")
const supabase = createClient(supabaseUrl, supabaseServiceKey); // As per your indication, this setup works for DB access

// --- CRITICAL: Handle uncaught exceptions and unhandled promise rejections ---
process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err.message);
    console.error(err.stack);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
    console.error(reason.stack || reason);
    process.exit(1);
});

app.use(express.json());
app.use(cors({
    origin: frontendUrl.trim(), // Use the trimmed value to prevent whitespace issues
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200
}));

// --- Helper function to copy directory recursively ---
// This ensures we copy only the content, not the .git folder from the boilerplate.
async function copyDir(src, dest) {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });
    
    for (let entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        // Skip .git directory if present in the source, we'll init our own Git repo in dest
        if (entry.name === '.git') {
            continue;
        }
        
        if (entry.isDirectory()) {
            await copyDir(srcPath, destPath);
        } else {
            await fs.copyFile(srcPath, destPath);
        }
    }
}

// --- Helper Functions (for Vercel API calls) ---
async function callVercelApi(endpoint, method = 'GET', body = null) {
    const headers = {
        'Authorization': `Bearer ${vercelApiToken}`,
        'Content-Type': 'application/json',
    };
    const url = `https://api.vercel.com${endpoint}`;
    console.log(`[Vercel API Call] Method: ${method}, Endpoint: ${url}`);
    if (body) {
        console.log(`[Vercel API Call] Body: ${JSON.stringify(body).substring(0, 200)}...`);
    }

    const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });

    if (!res.ok) {
        const errorText = await res.text();
        console.error(`Vercel API Error (${endpoint}): ${res.status} ${res.statusText}`);
        console.error('Vercel Response Body:', errorText);
        throw new Error(`Vercel API call failed: ${res.statusText} - ${errorText}`);
    }
    const jsonResponse = await res.json();
    console.log(`[Vercel API Call] Success response: ${JSON.stringify(jsonResponse).substring(0, 200)}...`);
    return jsonResponse;
}

// --- API Endpoints ---

// Main endpoint to generate code and trigger deployment
app.post('/generate-and-deploy', async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required.' });
    }

    const pageId = randomUUID();
    const repoSlug = `ai-lp-${pageId.substring(0, 8)}`;
    const githubRepoUrl = `https://github.com/${githubUsername}/${repoSlug}.git`; // URL for the NEW repo
    let deployedUrl = '';
    let vercelProjectId = '';
    let vercelDeploymentId = '';
    let generatedCode = '';

    console.log(`[${pageId}] Initiating new generation for prompt: "${prompt.substring(0, Math.min(prompt.length, 50))}"`);

    // 1. Initial Supabase record (status: pending)
    try {
        const { data, error } = await supabase.from('generated_pages').insert({ // Use supabase (the one that "works")
            id: pageId,
            prompt: prompt,
            status: 'pending',
            github_repo_url: githubRepoUrl,
            content: {} // Ensure content is provided, even if empty initially
        }).select().single();
        if (error) throw error;
        console.log(`[${pageId}] Supabase record created. Status: pending.`);
    } catch (dbError) {
        console.error(`[${pageId}] ERROR: Supabase initial insert error:`, dbError);
        console.error(`[${pageId}] ERROR: Supabase details:`, dbError.message, dbError.hint, dbError.code);
        return res.status(500).json({ error: 'Could not create project record in database.' });
    }

    // Immediately respond to frontend, then perform heavy lifting asynchronously.
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
    (async () => {
        let tempDir; // Root temp dir for this generation
        let boilerplateClonePath; // Path where boilerplate is temporarily cloned
        let newClientRepoPath;   // Path where the new client repo will be assembled

        try {
            // Update status in DB
            await supabase.from('generated_pages').update({ status: 'generating_code' }).eq('id', pageId); // Use supabase
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
            await supabase.from('generated_pages').update({ // Use supabase for updates
                status: 'code_generated',
                generated_code: generatedCode
            }).eq('id', pageId);
            console.log(`[${pageId}] Code generated and saved to DB. Length: ${generatedCode.length} chars.`);


            // 3. Create GitHub Repo (BLANK)
            await supabase.from('generated_pages').update({ status: 'creating_repo' }).eq('id', pageId); // Use supabase for updates
            console.log(`[${pageId}] Status updated to creating_repo.`);
            const createRepoBody = {
                name: repoSlug,
                private: true, // Keep client pages private
                description: `AI Generated Landing Page for prompt: "${prompt.substring(0, Math.min(prompt.length, 100))}"`,
                auto_init: false, // IMPORTANT: Don't auto-initialize with README, we want it completely blank
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
                console.log(`[${pageId}] GitHub blank repo created: ${repoSlug}`);
            } catch (githubErr) {
                console.error(`[${pageId}] ERROR creating GitHub repo (network/API call issue):`, githubErr.message);
                throw new Error(`Failed to create GitHub repo: ${githubErr.message}`);
            }


            // 4. Prepare and Push to New GitHub Repo - THE CORE FIX!
            await supabase.from('generated_pages').update({ status: 'pushing_code' }).eq('id', pageId); // Use supabase for updates
            console.log(`[${pageId}] Status updated to pushing_code.`);

            tempDir = path.join('/tmp', pageId); // Root temp dir for this generation
            boilerplateClonePath = path.join(tempDir, 'boilerplate_temp_clone'); // Where boilerplate is temporarily cloned
            newClientRepoPath = path.join(tempDir, repoSlug); // Path where the new client repo will be assembled

            try {
                // 1. Ensure the root temporary directory is clean and exists
                if (await fs.stat(tempDir).catch(() => null)) {
                    await fs.rm(tempDir, { recursive: true, force: true });
                    console.log(`[${pageId}] Cleaned up existing temporary directory ${tempDir} before new operations.`);
                }
                await fs.mkdir(tempDir, { recursive: true });

                // 2. Clone boilerplate to a *separate* temporary directory
                console.log(`[${pageId}] Attempting to clone boilerplate from ${boilerplateRepoUrl} to ${boilerplateClonePath}`);
                const git = simpleGit(); // Use a fresh simpleGit instance for cloning
                await git.clone(`https://${githubUsername}:${githubPat}@github.com/${githubUsername}/nextjs-lp-boilerplate.git`, boilerplateClonePath, ['--branch', boilerplateRepoBranch]);
                console.log(`[${pageId}] Cloned boilerplate successfully into ${boilerplateClonePath}.`);

                // 3. Initialize a *Brand New, Empty Git Repository* in the client's final repo directory
                console.log(`[${pageId}] Initializing new empty git repo at ${newRepoWorkingPath}`);
                await fs.mkdir(newRepoWorkingPath, { recursive: true }); // Create directory for the new repo
                const newRepoGit = simpleGit({ baseDir: newRepoWorkingPath });
                await newRepoGit.init();
                await newRepoGit.addConfig('user.name', githubUsername);
                await newRepoGit.addConfig('user.email', `${githubUsername}@users.noreply.github.com`);
                
                // 4. Copy the *contents* of the cloned boilerplate into the new repo (excluding .git)
                console.log(`[${pageId}] Copying boilerplate files from ${boilerplateClonePath} to ${newRepoWorkingPath} (excluding .git)`);
                await copyDir(boilerplateClonePath, newRepoWorkingPath); // Helper function copies contents
                
                // 5. Overwrite the main page.tsx with AI-generated code inside the NEW client repo
                const pageTsxPath = path.join(newRepoWorkingPath, 'src', 'app', 'page.tsx');
                console.log(`[${pageId}] Writing AI-generated code to: ${pageTsxPath}`);
                await fs.writeFile(pageTsxPath, generatedCode);
                console.log(`[${pageId}] Injected AI-generated code into page.tsx.`);

                // 6. Add remote origin and push from the NEWLY INITIALIZED REPO
                const authenticatedNewRepoUrl = `https://${githubUsername}:${githubPat}@github.com/${githubUsername}/${repoSlug}.git`;
                await newRepoGit.addRemote('origin', authenticatedNewRepoUrl);
                console.log(`[${pageId}] Added new 'origin' remote pointing to ${repoSlug}.`);
                
                await newRepoGit.add('.'); // Stage all changes in the new repo
                console.log(`[${pageId}] Added files for commit.`);
                
                await newRepoGit.commit('feat: AI generated initial landing page code');
                console.log(`[${pageId}] Committing to local repo.`);

                console.log(`[${pageId}] Attempting to push code to: ${authenticatedNewRepoUrl}`);
                await newRepoGit.push('origin', boilerplateRepoBranch); // Removed --force, as it's a first push to empty repo
                console.log(`[${pageId}] Pushed AI-generated code to new GitHub repo successfully.`);

            } catch (gitOpErr) {
                console.error(`[${pageId}] ERROR during repo setup or git operations:`, gitOpErr.message);
                if (gitOpErr.stdout) console.error(`[${pageId}] Git stdout (detail):`, gitOpErr.stdout.toString());
                if (gitOpErr.stderr) console.error(`[${pageId}] Git stderr (detail):`, gitOpErr.stderr.toString());
                throw new Error(`Failed to setup repo and push code: ${gitOpErr.message}`);
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
                outputDirectory: '.next',
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
            const subdomain = repoSlug;
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
                            let buildLogsUrl = `https://vercel.com/${githubUsername}/${repoSlug}/deployments/${latestDeployment.uid}`;
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