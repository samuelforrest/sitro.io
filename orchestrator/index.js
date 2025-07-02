// orchestrator/index.js
// THIS WORKS ALL THE WAY TILL VERCEL
// Merged version - Database handling from file 1, Git operations from file 2
require('dotenv').config(); // Load environment variables (locally for testing, but does nothing in Cloud Run)
const express = require('express');
// REMOVE THIS LINE:
// const { GoogleGenerativeAI } = require('@google/generative-ai');
// ADD THIS LINE:
const Anthropic = require('@anthropic-ai/sdk'); // For Claude API

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
// ADD THESE LINES:
const anthropicApiKey = process.env.ANTHROPIC_API_KEY
const claudeModel = 'claude-sonnet-4-20250514'; // Using Haiku as requested

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
// ADD THESE LINES:
console.log(`  ANTHROPIC_API_KEY_LOADED: ${!!anthropicApiKey}`);
console.log(`  CLAUDE_MODEL: ${claudeModel}`);

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
if (!anthropicApiKey || !supabaseUrl || !supabaseServiceKey || !githubUsername || !githubPat || !vercelApiToken || !vercelDomain || !boilerplateRepoUrl || !frontendUrl) {
    console.error("CRITICAL ERROR: One or more essential environment variables are missing or undefined!");
    console.error("  Missing/Undefined variables details:");
    // MODIFY THIS LINE:
    if (!anthropicApiKey) console.error("    - ANTHROPIC_API_KEY");
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

// ADD THIS BLOCK:
// Anthropic Claude
const anthropic = new Anthropic({ apiKey: anthropicApiKey });

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

            // 2. Generate React/TS/Tailwind Code with Claude Haiku
            console.log(`[${pageId}] Calling Claude API with model: ${claudeModel}...`);

            // REMOVE THIS BLOCK:
            // const reactGenerationPrompt = `
            // Generate a single React TypeScript functional component for a full landing page.
            // ... (rest of Gemini prompt)
            // `;
            // const result = await geminiModel.generateContent(reactGenerationPrompt);
            // const response = await result.response;
            // generatedCode = response.text().replace(/```tsx\s*|```/g, '').trim();

            // ADD THIS NEW CLAUDE API CALL BLOCK:
            const reactGenerationPrompt = `
You are an expert React TypeScript developer specialized in creating modern, performant, and visually appealing landing pages with Tailwind CSS and Framer Motion. Your task is to generate a single React TypeScript functional component named 'LandingPage' based on the user's detailed description. This component will be used in a Next.js App Router project.

**IMPORTANT INSTRUCTIONS FOR YOUR OUTPUT:**
- DO NOT include any conversation or markdown (like tsx blocks) before or after the code. Provide ONLY the complete, valid TypeScript React component code.
- DO NOT include "use client";, "import { motion } from framer-motion";, "import React from react";, or "import { easeIn, easeOut, easeInOut } from framer-motion"; in your output. These will be programmatically injected by the system.
- Begin your output DIRECTLY with "const LandingPage: React.FC = () => {" function declaration.
- DO NOT include any other external imports (e.g., useState, useEffect from React, or any other libraries beyond what is implicitly part of JSX/React itself).
- DO NOT include any leading comments or other non-function-declaration-code before the "const LandingPage..." line.
- Ensure all styling is done using Tailwind CSS utility classes directly within the JSX. Do NOT use inline style objects or separate CSS files.
- Ensure the page is fully responsive using Tailwind responsive prefixes (e.g., md:text-lg, lg:flex).

**Core Design Theme: Animated, Cool, Dark AI Tech Startup.**
- Color Palette: Utilize a deep, dark background (e.g., very dark blue, charcoal, near-black) with vibrant, high-contrast neon accent colors (e.g., electric cyan, fuchsia, lime green, or a combination). Apply these accents to text highlights, buttons, subtle glows, and gradients. Avoid plain primary colors.
- Animations (Strategic Use for Impact - Do NOT over-animate):
  * MUST use "motion." prefixes from Framer Motion for key animated elements. Focus animations on the Hero section, Call-to-Action, and section introductions.
  * Framer Motion Structure Guidance:
    - For "initial" and "whileInView" (or "animate") states on sections/containers: Define a "variants" object (e.g., sectionVariants, itemVariants) with "hidden" and "visible" (or "show") keys. Assign this to the "variants" prop of motion.section or motion.div. Example: variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
    - For "whileHover" and "whileTap" interactive effects: DO NOT define these inside a "variants" object. Instead, create a separate object (e.g., buttonHoverProps, linkInteractiveProps) that contains the whileHover and whileTap properties directly. Spread this object onto the motion component.
      Example for a button: const buttonProps = { whileHover: { scale: 1.05 }, whileTap: { scale: 0.95 } }; then use <motion.button {...buttonProps}>.
      Example for a link: const linkProps = { whileHover: { y: -2, color: "#FF00FF" }, whileTap: { scale: 0.98 } }; then use <motion.a {...linkProps}>.
  * Easing for Framer Motion: For "transition" properties, use cubic bezier arrays for custom easing, or the string literal "linear".
    - Example ease: [0.25, 0.1, 0.25, 1] (for ease-out).
    - Example ease: [0.42, 0, 1, 1] (for ease-in).
    - Example ease: [0.42, 0, 0.58, 1] (for ease-in-out).
    - Example ease: "linear".
    - NEVER use string values like "easeOut" or "easeIn" without the quotes as a variable, and do NOT use them as simple string literals with single quotes (e.g., "easeOut") if the array format is preferred, only use the cubic bezier arrays for non-linear easing.
  * Implement simple yet elegant fade-ins and subtle slide-ups for major sections and their content.
  * Minimal, subtle continuous background animations (e.g., animate-pulse with low opacity or slow gradients) are encouraged for atmosphere.
  * Keep animation complexity reasonable to ensure efficient code generation.

**Page Structure - ABSOLUTELY ESSENTIAL SECTIONS:**
1. Fixed/Sticky Header (Navbar): Include a nav element at the top.
   * Contain a prominent brand/logo (text-based or simple SVG placeholder) and a set of navigation links.
   * Navigation links (e.g., Home, Features, About, Contact) must link to different sections on the same page using smooth scrolling anchors (e.g., <a href="#features">Features</a>).
   * Implement a responsive hamburger menu (hidden/shown with Tailwind classes) for smaller screens. Provide the basic JSX structure for this, but DO NOT include any React hooks or JavaScript logic for toggling its visibility.
2. Main Content Sections (Each MUST have a unique "id" for navigation):
   * A prominent Hero Section (id="hero" or id="home") with a strong headline and Call-to-Action.
   * Features/Services section(s) (id="features").
   * About Us/Our Mission section (id="about").
   * Testimonials or Social Proof section (id="testimonials").
   * Call-to-Action section (id="cta").
   * Contact section (id="contact").
3. Comprehensive Footer: Include a footer element at the bottom.
   * Contain copyright information, quick links, and social media icons/links (use placeholder SVG/text for icons).

**Content & Design Principles:**
- Generate detailed, compelling, and benefit-driven placeholder content perfectly matching the business theme.
- Consistent Spacing: Use px- and py- on sections and inner containers. Use mx-auto and max-w-7xl on main content containers. Ensure consistent vertical margins (mb-).
- Visual Separation: Use appropriate py- values for sections. Vary background shades slightly between sections.
- Modern Layouts: Employ grid and flex layouts effectively.
- Interactivity: Ensure all interactive elements have clear hover: and focus: states.
- Conciseness: Generate clean, efficient, and concise code.

**Strict Output Constraints:**
Strict Output Constraints:
**Output ONLY the complete and valid TypeScript React functional component code.**
**The component MUST be named 'LandingPage'.**
**Start your output DIRECTLY with the function declaration: 'const LandingPage: React.FC = () => {'.**
**The very last line of your output MUST be: 'export default LandingPage;'. Ensure this is present and correct.**
**DO NOT include any surrounding markdown (like \`\`\`tsx or \`\`\`) or any conversational text.**
**DO NOT include 'tailwind.config.js' or '<script src="https://cdn.tailwindcss.com"></script>'.
**Ensure all JSX is valid and all TypeScript types (like React.FC) are correctly used.

Description for the landing page: "${prompt}"
`;

            let generatedCodeRaw;
            try {
                const claudeResponse = await anthropic.messages.create({
                    model: claudeModel,
                    max_tokens: 10000, // Haiku is fast, 4000 tokens max should be plenty for a landing page
                    messages: [
                        {
                            role: 'user',
                            content: reactGenerationPrompt,
                        },
                    ],
                });
                generatedCodeRaw = claudeResponse.content[0].text;
                console.log(`[${pageId}] Claude API call completed. Raw response length: ${generatedCodeRaw.length} chars.`);
            } catch (claudeError) {
                console.error(`[${pageId}] ERROR: Claude API call failed:`, claudeError.error || claudeError.message || claudeError);
                throw new Error(`AI generation failed with Claude: ${claudeError.message || 'Unknown Claude API error'}`);
            }

            // Your existing cleanup logic (including header and ease fixes)
            generatedCode = generatedCodeRaw.replace(/```tsx\s*|```/g, '').trim();

            // --- START OF THE BETTER FIX: PROGRAMMATIC HEADER INJECTION ---
            const requiredHeader = `"use client";\nimport { motion } from "framer-motion";\nimport React from "react";\n\n`; // This line is correct

            // Clean AI's output by removing any incorrect header it might have tried to generate
            const cleanGeneratedCode = generatedCode
                // These specific replacements are still useful as AI might try to generate them
                .replace(/^"use client";\s*/, '')
                .replace(/^use client";\s*/, '')
                .replace(/^import \{ motion \} from "framer-motion";\s*/, '')
                .replace(/^import React from "react";\s*/, '')
                .replace(/^import React, \{ useState \} from "react";\s*/, '')
                // ADD THIS LINE to remove Framer Motion easing imports if Claude generates them
                .replace(/^import \{ easeIn, easeOut, easeInOut \} from "framer-motion";\s*/, '')
                // General cleanup
                .replace(/^\/\/.*?\n/g, '') // Removes single-line comments at the start
                .replace(/^\s*typescript\s*\n?/i, '') // Removes "typescript" declaration (case-insensitive)
                .trim();

            // Prepend the absolutely correct header to the cleaned code
            generatedCode = requiredHeader + cleanGeneratedCode;
            // --- END OF THE BETTER FIX ---

            // --- START OF NEW FIX: PROGRAMMATIC EASE STRING LITERAL/FUNCTION CORRECTION ---
            // This regex will now find 'ease: "..."' or 'ease: '...' (any quotes)
            // It replaces them with Framer Motion's explicitly recognized literal easing strings.
            // The prompt has been updated to encourage array format or 'linear' string for ease.
            generatedCode = generatedCode.replace(/ease:\s*(["'])(.*?)\1/g, (match, quoteType, p1) => {
                const originalEaseValue = p1.trim(); // Get the actual value, trim whitespace

                let fixedEaseValue;
                // Claude prefers arrays or 'linear'. We map common string names to their array equivalents or keep 'linear'.
                // If Claude outputs 'easeOut', this converts it to [0.25, 0.1, 0.25, 1]
                switch (originalEaseValue) {
                    case 'easeOut':
                    case '[0.25, 0.1, 0.25, 1]': // If AI generated it as a string array
                        fixedEaseValue = '[0.25, 0.1, 0.25, 1]'; // Cubic bezier for ease-out
                        break;
                    case 'easeIn':
                    case '[0.42, 0, 1, 1]': // If AI generated it as a string array
                        fixedEaseValue = '[0.42, 0, 1, 1]'; // Cubic bezier for ease-in
                        break;
                    case 'easeInOut':
                    case '[0.42, 0, 0.58, 1]': // If AI generated it as a string array
                        fixedEaseValue = '[0.42, 0, 0.58, 1]'; // Cubic bezier for ease-in-out
                        break;
                    case 'linear':
                        fixedEaseValue = "'linear'"; // Keep as string literal if linear
                        break;
                    default:
                        // If AI generated something else, or a generic string, default to ease-out cubic bezier
                        console.warn(`[${pageId}] WARN: AI generated unrecognized ease value: '${originalEaseValue}'. Defaulting to ease-out cubic bezier.`);
                        fixedEaseValue = '[0.25, 0.1, 0.25, 1]';
                }
                // Return as 'ease: [array]' or 'ease: 'linear''
                return `ease: ${fixedEaseValue}`;
            });
            // --- END OF NEW FIX ---

            if (!generatedCode.includes('export default LandingPage;')) {
                console.warn(`[${pageId}] WARN: AI omitted 'export default LandingPage;'. Appending it programmatically.`);
                generatedCode += `\n\nexport default LandingPage;`; // Add it with newlines for formatting
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
                description: `AI Generated Landing Page for prompt: "${prompt.substring(0, Math.min(prompt.length, 100)).replace(/\s+/g, ' ').trim()}"`, // Retained prompt sanitization
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

            // 6. Add Custom Domain (Subdomain)
            // ... (existing code for adding domain)
            console.log(`[${pageId}] Added custom domain: ${fullDomain}`);

            // >>>>> FIX START (Programmatic Commit to Trigger Vercel - with delay) <<<<<
            // Vercel requires a new commit to trigger a build after project creation and domain adding.
            // We'll perform a small, innocuous commit to the newly created repo.

            console.log(`[${pageId}] Delaying final commit to ensure Vercel repo indexing...`);
            // Add a short delay (e.g., 5 seconds) to give Vercel time to register the new repo's first commit
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 7 seconds - change later

            console.log(`[${pageId}] Performing a final commit to trigger Vercel deployment...`);
            
            // Get the git instance for the new client repo
            const newRepoGit = simpleGit({ baseDir: newClientRepoPath });

            // Create or update a README.md file
            const readmePath = path.join(newClientRepoPath, 'README.md');
            const readmeContent = `# AI Generated Landing Page\n\nGenerated by AI Page Factory on ${new Date().toISOString()} (ID: ${pageId})\n\nThis project was automatically generated from your prompt.`;
            
            await fs.writeFile(readmePath, readmeContent);
            console.log(`[${pageId}] Updated README.md.`);

            // Add the README.md to staging
            await newRepoGit.add(readmePath);
            console.log(`[${pageId}] Added README.md to staging.`);

            // Commit the README.md change
            await newRepoGit.commit('chore: Trigger Vercel deployment with README update');
            console.log(`[${pageId}] Committed README update.`);

            // Push the README.md commit to GitHub (this will trigger Vercel!)
            const authenticatedNewRepoUrl = `https://${githubUsername}:${githubPat}@github.com/${githubUsername}/${repoSlug}.git`;
            // Ensure origin is set correctly just before push, in case it was modified
            await newRepoGit.addRemote('origin', authenticatedNewRepoUrl).catch(() => {}); // Add or update remote
            console.log(`[${pageId}] Re-confirming remote for final push.`);

            await newRepoGit.push('origin', boilerplateRepoBranch); 
            console.log(`[${pageId}] Pushed README update to trigger Vercel successfully.`);
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