// orchestrator/index.js  stable
// THIS WORKS ALL THE WAY TILL VERCEL
// Merged version - Database handling from file 1, Git operations from file 2
require('dotenv').config(); // Load environment variables (locally for testing, but does nothing in Cloud Run)
const express = require('express');
// REMOVE THIS LINE:
// const { GoogleGenerativeAI } = require('@google/generative-ai');
// REMOVE THIS LINE:
// const Anthropic = require('@anthropic-ai/sdk'); // For Claude API
// ADD THIS LINE:
const OpenAI = require('openai'); // For OpenAI GPT-4.1

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

// REMOVE THIS LINE:
// const geminiApiKey = process.env.GEMINI_API_KEY;
// REMOVE THESE LINES:
// const anthropicApiKey = process.env.ANTHROPIC_API_KEY
// const claudeModel = 'claude-sonnet-4-20250514'; // Using Haiku as requested
// ADD THESE LINES:
const openaiApiKey = process.env.OPENAI_API_KEY;
const gptModel = 'gpt-4.1'; // Using GPT-4.1 as requested

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
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
// REMOVE THIS LINE:
// console.log(`  GEMINI_API_KEY_LOADED: ${!!geminiApiKey}`);
// REMOVE THESE LINES:
// console.log(`  ANTHROPIC_API_KEY_LOADED: ${!!anthropicApiKey}`);
// console.log(`  CLAUDE_MODEL: ${claudeModel}`);
// ADD THESE LINES:
console.log(`  OPENAI_API_KEY_LOADED: ${!!openaiApiKey}`);
console.log(`  GPT_MODEL: ${gptModel}`);

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
// MODIFY THIS LINE:
if (!openaiApiKey || !supabaseUrl || !supabaseServiceKey || !githubUsername || !githubPat || !vercelApiToken || !vercelDomain || !boilerplateRepoUrl || !frontendUrl) {
    console.error("CRITICAL ERROR: One or more essential environment variables are missing or undefined!");
    console.error("  Missing/Undefined variables details:");
    // MODIFY THIS LINE:
    if (!openaiApiKey) console.error("    - OPENAI_API_KEY");
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

// REMOVE THIS BLOCK:
// Google Gemini
// const genAI = new GoogleGenerativeAI(geminiApiKey);
// const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// REMOVE THIS BLOCK:
// Anthropic Claude
// const anthropic = new Anthropic({ apiKey: anthropicApiKey });

// ADD THIS BLOCK:
// OpenAI GPT
const openai = new OpenAI({ apiKey: openaiApiKey });

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

// NEW HELPER FUNCTION TO GENERATE SUBDOMAIN WITH AI
async function generateSubdomainSlug(prompt, pageId) {
    console.log(`[${pageId}] Calling OpenAI to generate a subdomain slug.`);
    try {
        const slugPrompt = `
            Analyze the following user prompt for a landing page. Your task is to extract the core subject, person's name, or brand name and create a short, clean, URL-safe slug for a subdomain.

            RULES:
            - Output ONLY the slug text. No explanations, no markdown, no quotes.
            - The slug must be all lowercase.
            - It should contain only letters (a-z) and numbers (0-9).
            - Do not use hyphens or spaces.
            - Keep it concise, ideally between 5 and 20 characters.

            Examples:
            - Prompt: "a portfolio for a photographer named John Doe" -> "johndoephoto"
            - Prompt: "a landing page for a new SaaS product called 'Innovate AI'" -> "innovateai"
            - Prompt: "samuel forrest cv online black color" -> "samuelforrestcv"
            - Prompt: "a new coffee shop in brooklyn called 'The Daily Grind'" -> "dailygrind"

            User Prompt: "${prompt}"
        `;

        const openaiResponse = await openai.chat.completions.create({
            model: 'gpt-4.1', // Using a powerful model ensures better extraction
            messages: [{ role: 'user', content: slugPrompt }],
            max_tokens: 25,
            temperature: 0.1, // Low temperature for deterministic, clean output
        });

        const rawSlug = openaiResponse.choices[0].message.content.trim();
        
        // Final sanitization just in case the AI doesn't follow rules perfectly
        const sanitizedSlug = rawSlug.toLowerCase().replace(/[^a-z0-9]/g, '');

        if (sanitizedSlug) {
            console.log(`[${pageId}] AI generated slug: '${sanitizedSlug}'`);
            return sanitizedSlug;
        } else {
            console.warn(`[${pageId}] WARN: AI returned an empty or invalid slug. Will use fallback.`);
            return null; // Return null if AI fails or returns empty string
        }

    } catch (error) {
        console.error(`[${pageId}] ERROR: Failed to generate subdomain slug with AI:`, error.message);
        return null; // Return null on error to trigger the fallback
    }
}

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

    // --- START: MODIFIED NAMING LOGIC ---
    // 1. Attempt to generate a smart slug from the prompt using AI
    let repoSlug;
    const aiGeneratedSlug = await generateSubdomainSlug(prompt, pageId);

    // 2. Use the AI slug if successful, otherwise fall back to the original unique ID method
    if (aiGeneratedSlug) {
        // The random suffix has been removed from this line as requested.
        // WARNING: This may cause naming collisions if two prompts generate the same slug.
        repoSlug = aiGeneratedSlug; 
    } else {
        // Fallback if AI fails or returns an invalid slug
        console.log(`[${pageId}] Using fallback naming convention.`);
        repoSlug = `ai-lp-${pageId.substring(0, 8)}`; 
    }
    console.log(`[${pageId}] Final repoSlug decided: ${repoSlug}`);
// --- END: MODIFIED NAMING LOGIC ---

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

            // 2. Generate React/TS/Tailwind Code with GPT-4.1
            console.log(`[${pageId}] Calling OpenAI API with model: ${gptModel}...`);

            const reactGenerationPrompt = `You are an expert React TypeScript developer specialized in creating modern, performant, and visually appealing landing pages with Tailwind CSS and Framer Motion. Your task is to generate a single React TypeScript functional component named LandingPage based on the user's detailed description. This component will be used in a Next.js App Router project.

OUTPUT INSTRUCTIONS (STRICT):
- Generate ONLY the complete and valid TypeScript React functional component code.
- The component MUST be named LandingPage.
- Start your output DIRECTLY with: const LandingPage: React.FC = () => {
- The very last line of your output MUST be: export default LandingPage;
- DO NOT include any conversation, markdown formatting, or external imports (e.g., useState, useEffect, or other libraries beyond basic React/Framer Motion types).
- DO NOT include use client; or Framer Motion imports in your output; these are handled externally.
- DO NOT include tailwind.config.js or script tags.
- Ensure all styling uses Tailwind CSS utility classes directly within JSX. No inline style objects or separate CSS files.
- Ensure full responsiveness using Tailwind's prefixes (e.g., md:text-lg, lg:flex).

DESIGN & STRUCTURE GUIDANCE:
- Theme & Style: Unless the user's prompt explicitly specifies a theme (e.g., dark, light, minimalist, retro) or specific colors, default to an Animated, Cool, Dark AI Tech Startup aesthetic. This includes:
    - Color Palette (Default): Deep, dark backgrounds (e.g., very dark blue, charcoal) with a few vibrant gradients which look good, or appropriate accent colours.
    - DO NOT give buttons gradients, or text gradients, only backgrounds may have limited use of gradients.
- Animations (Strategic Framer Motion Use): Implement dynamic, visually engaging animations. Focus on key elements like:
    - Hero Section: Primary entrance animations (fade-in, slide-up) for headline, text, and CTA.
    - Key Sections: Subtle animations (fade-in, scale, slide) when sections enter the viewport (whileInView).
    - Interactive Elements: Clear hover and tap effects for buttons and links.
    - Background: Minimal, subtle continuous background animations (e.g., gentle pulsing, animated gradients).
    - Easing: For transition properties, use cubic bezier arrays (e.g., [0.25, 0.1, 0.25, 1] for ease-out, [0.42, 0, 0.58, 1] for ease-in-out) or the string literal linear.

ESSENTIAL PAGE SECTIONS:
- Fixed/Sticky Header (Navbar):
    - Contain a prominent brand/logo (text or simple SVG placeholder).
    - Navigation links (Home, Features, About, Testimonials, Contact) that link to sections using id anchors.
    - Responsive hamburger menu structure for mobile (no JS logic for toggle; use Tailwind classes for hidden/shown states).
- Main Content Sections (Each MUST have a unique id for navigation):
    - Hero Section (id="hero" or id="home"): Strong headline, engaging sub-text, prominent Call-to-Action.
    - Features/Services Section(s) (id="features"): Highlight offerings.
    - About Us/Mission Section (id="about"): Explain purpose.
    - Testimonials/Social Proof Section (id="testimonials"): Display client feedback.
    - Call-to-Action Section (id="cta"): Final engagement push.
    - Contact Section (id="contact"): Contact details/form.
- Comprehensive Footer:
    - Copyright information.
    - Quick links.
    - Social media icons/links (use placeholder SVG/text).

CONTENT & BEST PRACTICES:
- Generate detailed, compelling, and benefit-driven placeholder content matching the business theme.
- Ensure consistent spacing using Tailwind classes.
- Create clear visual separation between sections using distinct padding values and subtle background variations.
- Employ modern layouts (grid, flex).
- Ensure all interactive elements have clear hover and focus states.
- Generate clean, efficient, and concise code.

Limit output to around 11,500 tokens.

Description for the landing page: "${prompt}"
`;

            let generatedCodeRaw;
            try {
                const openaiResponse = await openai.chat.completions.create({
                    model: gptModel,
                    messages: [
                        {
                            role: 'user',
                            content: reactGenerationPrompt,
                        },
                    ],
                    max_tokens: 15000,
                    temperature: 0.7,
                });
                generatedCodeRaw = openaiResponse.choices[0].message.content;
                console.log(`[${pageId}] OpenAI API call completed. Raw response length: ${generatedCodeRaw.length} chars.`);
            } catch (openaiError) {
                console.error(`[${pageId}] ERROR: OpenAI API call failed:`, openaiError.error || openaiError.message || openaiError);
                throw new Error(`AI generation failed with OpenAI: ${openaiError.message || 'Unknown OpenAI API error'}`);
            }

            // Your existing cleanup logic (including header and ease fixes)
            generatedCode = generatedCodeRaw.replace(/```tsx\s*|```/g, '').trim();

            // --- START OF THE BETTER FIX: PROGRAMMATIC HEADER INJECTION ---
            const requiredHeader = `import { motion } from "framer-motion";\nimport React from "react";\n\n`; // Removed "use client"

            // Clean AI's output by removing any incorrect header it might have tried to generate
            const cleanGeneratedCode = generatedCode
                // Remove any imports that AI might try to generate (handled by requiredHeader)
                .replace(/^import \{ motion \} from "framer-motion";\s*/, '')
                .replace(/^import React from "react";\s*/, '')
                .replace(/^import React, \{ useState \} from "react";\s*/, '')
                // Remove Framer Motion easing imports if GPT generates them
                .replace(/^import \{ easeIn, easeOut, easeInOut \} from "framer-motion";\s*/, '')
                // General cleanup
                .replace(/^\/\/.*?\n/g, '') // Removes single-line comments at the start
                .replace(/^\s*typescript\s*\n?/i, '') // Removes "typescript" declaration (case-insensitive)
                .trim();

            // Prepend the absolutely correct header to the cleaned code
            generatedCode = requiredHeader + cleanGeneratedCode;
            // --- END OF THE BETTER FIX ---

            // --- START OF NEW FIX: PROGRAMMATIC EASE STRING LITERAL/FUNCTION CORRECTION ---
            generatedCode = generatedCode.replace(/ease:\s*(["'])(.*?)\1/g, (match, quoteType, p1) => {
                const originalEaseValue = p1.trim();
                let fixedEaseValue;
                switch (originalEaseValue) {
                    case 'easeOut':
                    case '[0.25, 0.1, 0.25, 1]':
                        fixedEaseValue = '[0.25, 0.1, 0.25, 1]';
                        break;
                    case 'easeIn':
                    case '[0.42, 0, 1, 1]':
                        fixedEaseValue = '[0.42, 0, 1, 1]';
                        break;
                    case 'easeInOut':
                    case '[0.42, 0, 0.58, 1]':
                        fixedEaseValue = '[0.42, 0, 0.58, 1]';
                        break;
                    case 'linear':
                        fixedEaseValue = "'linear'";
                        break;
                    default:
                        console.warn(`[${pageId}] WARN: AI generated unrecognized ease value: '${originalEaseValue}'. Defaulting to ease-out cubic bezier.`);
                        fixedEaseValue = '[0.25, 0.1, 0.25, 1]';
                }
                return `ease: ${fixedEaseValue}`;
            });
            // --- END OF NEW FIX ---

            if (!generatedCode.includes('export default LandingPage;')) {
                console.warn(`[${pageId}] WARN: AI omitted 'export default LandingPage;'. Appending it programmatically.`);
                generatedCode += `\n\nexport default LandingPage;`;
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
                private: true,
                description: `Sitro.io AI-Generated Landing Page for prompt: "${prompt.substring(0, Math.min(prompt.length, 100)).replace(/\s+/g, ' ').trim()}"`,
                auto_init: false,
            };
            try {
                const githubResponse = await fetch(`https://api.github.com/user/repos`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `token ${githubPat}`,
                        'Content-Type': 'application/json',
                        'User-Agent': githubUsername
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

            // 4. Prepare and Push to New GitHub Repo
            await supabase.from('generated_pages').update({ status: 'pushing_code' }).eq('id', pageId);
            console.log(`[${pageId}] Status updated to pushing_code.`);

            tempDir = path.join('/tmp', pageId);
            newClientRepoPath = path.join(tempDir, repoSlug);

            try {
                if (await fs.stat(tempDir).catch(() => null)) {
                    await fs.rm(tempDir, { recursive: true, force: true });
                }
                await fs.mkdir(tempDir, { recursive: true });

                const gitForClone = simpleGit();
                await gitForClone.clone(`https://${githubUsername}:${githubPat}@github.com/${githubUsername}/vite-react-tailwind-boilerplate.git`, newClientRepoPath, ['--branch', boilerplateRepoBranch]);
                
                const dotGitPath = path.join(newClientRepoPath, '.git');
                if (await fs.stat(dotGitPath).catch(() => null)) {
                    await fs.rm(dotGitPath, { recursive: true, force: true });
                }
                
                const newRepoGit = simpleGit({ baseDir: newClientRepoPath });
                await newRepoGit.init();
                await newRepoGit.addConfig('user.name', githubUsername);
                await newRepoGit.addConfig('user.email', `${githubUsername}@users.noreply.github.com`);
                
                const pageTsxPath = path.join(newClientRepoPath, 'src', 'App.tsx');
                await fs.writeFile(pageTsxPath, generatedCode);

                await newRepoGit.add('.');
                await newRepoGit.checkoutLocalBranch(boilerplateRepoBranch);
                await newRepoGit.commit('feat: AI generated initial landing page code');

                const authenticatedNewRepoUrl = `https://${githubUsername}:${githubPat}@github.com/${githubUsername}/${repoSlug}.git`;
                await newRepoGit.addRemote('origin', authenticatedNewRepoUrl);
                await newRepoGit.push('origin', boilerplateRepoBranch); 
                console.log(`[${pageId}] Pushed AI-generated code to new GitHub repo successfully.`);

            } catch (gitOpErr) {
                console.error(`[${pageId}] ERROR during repo setup or git operations:`, gitOpErr.message);
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
                installCommand: 'npm install',
                buildCommand: 'npm run build',
                outputDirectory: 'dist',
                framework: 'vite',
            };

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
                name: fullDomain,
            };

            await callVercelApi(
                `/v9/projects/${vercelProjectId}/domains${vercelTeamId ? `?teamId=${vercelTeamId}` : ''}`,
                'POST',
                addDomainBody
            );
            console.log(`[${pageId}] Added custom domain: ${fullDomain}`);

            // Programmatic Commit to Trigger Vercel
            await new Promise(resolve => setTimeout(resolve, 5000));

            const newRepoGit = simpleGit({ baseDir: newClientRepoPath });
            const readmePath = path.join(newClientRepoPath, 'README.md');
            const readmeContent = `# AI Generated Landing Page\n\nGenerated on ${new Date().toISOString()} (ID: ${pageId})`;
            await fs.writeFile(readmePath, readmeContent);
            await newRepoGit.add(readmePath);
            await newRepoGit.commit('chore: Trigger Vercel deployment');
            await newRepoGit.push('origin', boilerplateRepoBranch); 
            console.log(`[${pageId}] Pushed README update to trigger Vercel successfully.`);

            // 7. Wait for Deployment to be READY
            let deploymentReady = false;
            let retries = 0;
            const maxRetries = 40;
            console.log(`[${pageId}] Waiting for Vercel deployment of project ${vercelProjectId} to be READY...`);

            while (!deploymentReady && retries < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 5000));
                const deployments = await callVercelApi(
                    `/v6/deployments?projectId=${vercelProjectId}${vercelTeamId ? `&teamId=${vercelTeamId}` : ''}`
                );
                const latestDeployment = deployments.deployments[0];

                if (latestDeployment) {
                    vercelDeploymentId = latestDeployment.uid;
                    if (latestDeployment.state === 'READY' || latestDeployment.state === 'ERROR' || latestDeployment.state === 'CANCELED') {
                        deploymentReady = true;
                        if (latestDeployment.state === 'READY') {
                            deployedUrl = `https://${fullDomain}`;
                            console.log(`[${pageId}] Deployment READY! Final URL: ${deployedUrl}`);
                        } else {
                            throw new Error(`Vercel deployment failed with status: ${latestDeployment.state}.`);
                        }
                    }
                }
                retries++;
            }

            if (!deployedUrl) {
                throw new Error('Vercel deployment timed out or failed to find URL.');
            }

            // 8. Update Supabase record
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
                message: error.message || 'Unknown error during deployment process.'
            }).eq('id', pageId);
        } finally {
            if (tempDir && fs.rm) {
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

// ... all the code before this ...

app.listen(port, () => {
    console.log(`Orchestrator listening on port ${port}`);
});