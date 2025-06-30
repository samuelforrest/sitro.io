// orchestrator/index.js
// THIS WORKS ALL THE WAY TILL VERCEL
// Merged version - Database handling from file 1, Git operations from file 2
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
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // This is the key we're debugging
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
// >>>>>>> ADDED EXTREME SUPABASE KEY DEBUGGING <<<<<<<
console.log(`  SUPABASE_SERVICE_KEY (RAW): '${process.env.SUPABASE_SERVICE_KEY}'`);
console.log(`  SUPABASE_SERVICE_KEY (LENGTH): ${process.env.SUPABASE_SERVICE_KEY ? process.env.SUPABASE_SERVICE_KEY.length : 'N/A'}`);
console.log(`  SUPABASE_SERVICE_KEY (TRIMMED LENGTH): ${process.env.SUPABASE_SERVICE_KEY ? process.env.SUPABASE_SERVICE_KEY.trim().length : 'N/A'}`);
console.log(`  SUPABASE_SERVICE_KEY (CHAR 0): ${process.env.SUPABASE_SERVICE_KEY ? process.env.SUPABASE_SERVICE_KEY[0] : 'N/A'}`);
console.log(`  SUPABASE_SERVICE_KEY (CHAR LAST): ${process.env.SUPABASE_SERVICE_KEY ? process.env.SUPABASE_SERVICE_KEY[process.env.SUPABASE_SERVICE_KEY.length - 1] : 'N/A'}`);
// >>>>>>> END EXTREME SUPABASE KEY DEBUGGING <<<<<<<
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
console.log(`Orchestrator will allow CORS from: '${frontendUrl.trim()}'`);

// Google Gemini
const genAI = new GoogleGenerativeAI(geminiApiKey);
const geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Supabase Client
// This is the line that's failing with Invalid URL. It's using the raw variable.
const supabase = createClient(supabaseUrl, supabaseServiceKey); 

app.use(express.json());
app.use(cors({
    origin: '*', // TEMPORARY DEBUGGING - DO NOT USE IN PRODUCTION
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
}));

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

// Helper function to copy directory recursively
async function copyDir(src, dest) {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });
    
    for (let entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        // Skip .git directory to avoid copying git history
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
        let tempDir; // Root temp dir for this generation
        let boilerplateClonePath; // Path where boilerplate is temporarily cloned
        let newClientRepoPath;   // Path where the new client repo will be assembled

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

            // 3. Create GitHub Repo (BLANK)
            await supabase.from('generated_pages').update({ status: 'creating_repo' }).eq('id', pageId);
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

            // 4. Prepare and Push to New GitHub Repo - USING GIT OPERATIONS FROM FILE 2
            await supabase.from('generated_pages').update({ status: 'pushing_code' }).eq('id', pageId);
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

            // CRITICAL: Step 1: Clone boilerplate directly into the FINAL client repo path
            // The newClientRepoPath will become the base for the new Git repo.
            console.log(`[${pageId}] Cloning boilerplate from ${boilerplateRepoUrl} to ${newClientRepoPath}`);
            const gitForClone = simpleGit(); // Use a dedicated git instance for cloning
            await gitForClone.clone(`https://${githubUsername}:${githubPat}@github.com/${githubUsername}/nextjs-lp-boilerplate.git`, newClientRepoPath, ['--branch', boilerplateRepoBranch]);
            console.log(`[${pageId}] Cloned boilerplate successfully into ${newClientRepoPath}.`);

            // CRITICAL: Step 2: Delete the .git folder from the cloned boilerplate
            // This is vital to make it a clean, unversioned copy of the boilerplate *contents*.
            const dotGitPath = path.join(newClientRepoPath, '.git');
            if (await fs.stat(dotGitPath).catch(() => null)) { // Check if .git exists
                await fs.rm(dotGitPath, { recursive: true, force: true });
                console.log(`[${pageId}] Removed .git folder from cloned boilerplate.`);
            }
            
            // CRITICAL: Step 3: Initialize a *Brand New, Empty Git Repository* in the same path
            // This initializes a new repo that *already contains* the boilerplate files.
            console.log(`[${pageId}] Initializing new git repo at ${newClientRepoPath}`);
            const newRepoGit = simpleGit({ baseDir: newClientRepoPath }); // newRepoGit operates on the client's repo
            await newRepoGit.init();
            await newRepoGit.addConfig('user.name', githubUsername);
            await newRepoGit.addConfig('user.email', `${githubUsername}@users.noreply.github.com`);
            
            // Step 4: Overwrite the main page.tsx with AI-generated code (within the newly initialized repo)
            const pageTsxPath = path.join(newClientRepoPath, 'src', 'app', 'page.tsx');
            console.log(`[${pageId}] Writing AI-generated code to: ${pageTsxPath}`);
            await fs.writeFile(pageTsxPath, generatedCode);
            console.log(`[${pageId}] Injected AI-generated code into page.tsx.`);

            // CRITICAL: Step 5: Add all files (including those copied from boilerplate) to the new repo's staging area and commit
            await newRepoGit.add('.'); // Stage ALL files in the new repo
            console.log(`[${pageId}] Added files for commit.`);
            // CRITICAL: Ensure the branch exists and is checked out before commit/push
            await newRepoGit.checkoutLocalBranch(boilerplateRepoBranch); // Explicitly create/checkout the branch
            console.log(`[${pageId}] Checked out branch: ${boilerplateRepoBranch}.`);
            await newRepoGit.commit('feat: AI generated initial landing page code');
            console.log(`[${pageId}] Committed to local repo.`);

            // Step 6: Add remote origin and push from the NEWLY INITIALIZED REPO
            const authenticatedNewRepoUrl = `https://${githubUsername}:${githubPat}@github.com/${githubUsername}/${repoSlug}.git`;
            await newRepoGit.addRemote('origin', authenticatedNewRepoUrl);
            console.log(`[${pageId}] Added new 'origin' remote pointing to ${repoSlug}.`);
            
            console.log(`[${pageId}] Attempting to push code to: ${authenticatedNewRepoUrl}`);
            // Push to the newly defined origin, on the explicitly created branch
            await newRepoGit.push('origin', boilerplateRepoBranch); 
            console.log(`[${pageId}] Pushed AI-generated code to new GitHub repo successfully.`);
            // >>>>> FIX END <<<<<

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
                outputDirectory: '.next', // Default for Next.js App Router
                framework: 'nextjs',
                // public: false, // REMOVE THIS LINE ENTIRELY
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
                name: fullDomain, // <-- CRITICAL FIX: Add the 'name' property, which is the domain itself
            };

            console.log(`[${pageId}] Calling Vercel API to add domain: ${fullDomain} to project ${vercelProjectId}`);
            await callVercelApi(
                `/v9/projects/${vercelProjectId}/domains${vercelTeamId ? `?teamId=${vercelTeamId}` : ''}`,
                'POST',
                addDomainBody
            );
            console.log(`[${pageId}] Added custom domain: ${fullDomain}`);

            // >>>>> FIX START (Added Vercel Deployment Trigger) <<<<<
            // Explicitly trigger a deployment for the newly created project
            console.log(`[${pageId}] Explicitly triggering Vercel deployment for project ${vercelProjectId}...`);
            const triggeredDeployment = await callVercelApi(
                `/v13/deployments`, // Vercel's /v13/deployments endpoint for new deployments
                'POST',
                {
                    projectId: vercelProjectId,
                    gitSource: {
                        type: 'github',
                        repoId: vercelProject.gitRepository.id, // Use Vercel's repo ID
                        // For a new project created via API, you often just need projectId and repoId/orgId
                        // Or you can specify branch, commit SHA if pulling specific state
                        // Simplest for new project is often just project ID
                    },
                    ref: boilerplateRepoBranch, // The branch you just pushed to (e.g., 'main')
                    // teamId: vercelTeamId // Only if using a team
                }
                // Also need to correctly pass the teamId in the URL if it's a team project
                // The API for triggering builds can be tricky. Let's try the /v13/deployments endpoint
                // with minimal parameters first to ensure it's hit correctly.
                // Alternative: some APIs use /v9/projects/{projectId}/deployments
            );
            // Vercel's /v13/deployments requires project and git info
            // Let's refine this Vercel API call more precisely for auto-trigger
            const deploymentTriggerBody = {
                name: repoSlug, // The name of the deployment, often same as project
                // The Vercel documentation for triggering builds is a bit fragmented,
                // but the common approach is to provide the project ID and source.
                // It might require a 'ref' (branch name) or 'sha' (commit SHA).
                gitSource: { // Use this for triggering from a Git source
                    type: 'github',
                    repoId: vercelProject.gitRepository.id, // Vercel's internal ID for the repo (from project creation)
                    orgId: vercelProject.team.id, // Vercel's internal ID for the team (from project creation)
                    ref: boilerplateRepoBranch, // 'main'
                },
                // Other options like 'target' etc. are not needed for simple deploy
            };
            if (!vercelTeamId) { // If it's a personal account, no orgId is needed
                 delete deploymentTriggerBody.gitSource.orgId;
            }

            // Using the /v13/deployments endpoint as it's the more modern one for programmatically creating deployments
            const triggeredDeployResponse = await callVercelApi(
                `/v13/deployments${vercelTeamId ? `?teamId=${vercelTeamId}` : ''}`,
                'POST',
                deploymentTriggerBody
            );
            console.log(`[${pageId}] Vercel deployment trigger response: ${JSON.stringify(triggeredDeployResponse).substring(0, 200)}...`);
            // >>>>> FIX END <<<<<

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