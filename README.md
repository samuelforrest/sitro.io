# AI Landing Page Generator Platform (Monorepo)

A full-stack, production-ready AI-powered landing page generator. This monorepo contains both the backend orchestrator (API server) and the modern Next.js frontend (Fluc UI) for a seamless, end-to-end developer and user experience.

---

## 🏗️ Monorepo Structure

```
ai-lp-generator-platform/
├── orchestrator/      # Node.js Express backend API (Claude/Supabase/Git integration)
├── platform-ui/       # Next.js 15 frontend (Fluc UI, Tailwind, Radix, etc.)
└── README.md          # (You are here)
```

---

## 🚀 Features

- **AI-powered landing page generation** (Claude Sonnet/Haiku via Anthropic SDK)
- **Modern, beautiful UI** (Fluc design, fully responsive, App Router)
- **Live deployment status** and progress polling
- **No code editor** (focus on generation, not editing)
- **End-to-end integration**: prompt → backend → status → deployed URL
- **Production-ready**: error handling, timeouts, robust API
- **Monorepo**: easy to develop, deploy, and maintain

---

## Frontend: `/platform-ui`
## Backend:  `/orchestrator`

- **Framework:** [Next.js 15.3.4 (App Router)](https://nextjs.org/)
- **Language:** TypeScript ^5
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) (latest major version with new PostCSS plugin, custom gradients, modern utility classes)
- **CSS Processing:** [PostCSS](https://postcss.org/) with `@tailwindcss/postcss` plugin (transforms Tailwind utilities into optimized CSS)
- **UI Components:**
  - [Radix UI Primitives](https://www.radix-ui.com/primitives/docs/components/overview) (button, card, input, badge, progress, etc.)
  - [Lucide React](https://lucide.dev/) (icon set)
- **State/UX:**
  - React Suspense (for async data and loading states)
  - Custom animated hero/placeholder text
  - Fully responsive, mobile-first design
- **API Integration:**
  - Uses `NEXT_PUBLIC_BACKEND_API_URL` from `.env.local` to connect to orchestrator
- **No code sandbox/editor** (all code preview/editor functionality removed for simplicity and performance)

---

## 🎨 Why PostCSS?

**PostCSS** is a critical tool in our build pipeline that transforms CSS with JavaScript plugins. Here's why we use it:

### 🔧 **What PostCSS Does:**
1. **CSS Transformation**: Takes raw CSS and processes it through plugins
2. **Tailwind Integration**: The `@tailwindcss/postcss` plugin converts Tailwind utilities into actual CSS
3. **Optimization**: Removes unused CSS, minifies output, adds vendor prefixes
4. **Build Pipeline**: Integrates seamlessly with Next.js build process

### ⚡️ **Our PostCSS Setup** (`postcss.config.mjs`):
```javascript
const config = {
  plugins: ["@tailwindcss/postcss"], // Tailwind v4 PostCSS plugin
};
```

### 🚀 **Why We Need It:**
- **Tailwind CSS v4 requires PostCSS** - it's the new architecture (no more traditional config)
- **Build-time processing** - converts `className="bg-blue-500"` into actual CSS rules
- **Performance** - only includes CSS for utilities actually used in your components
- **Next.js integration** - works automatically with Next.js build system
- **Future-proof** - modern CSS processing standard

### 🔄 **How It Works:**
1. You write JSX with Tailwind classes: `<div className="bg-gradient-to-r from-blue-600 to-purple-600">`
2. PostCSS + Tailwind plugin scans your code during build
3. Generates optimized CSS with only the utilities you actually use
4. Next.js serves the final, minified CSS to browsers

Without PostCSS, Tailwind utilities would just be strings - PostCSS makes them actual styling!

---

## 🛠️ Backend: `/orchestrator`

- **Framework:** Node.js (Express)
- **Language:** JavaScript (ES2022+)
- **AI Integration:** [Anthropic SDK](https://docs.anthropic.com/claude/docs/anthropic-sdk) (Claude Sonnet/Haiku)
- **Database:** [Supabase](https://supabase.com/) (via supabase-js)
- **Other:**
  - [simple-git](https://www.npmjs.com/package/simple-git) (for GitHub repo operations)
  - [dotenv](https://www.npmjs.com/package/dotenv) (for local env)
  - [CORS](https://www.npmjs.com/package/cors)
  - [fs/promises](https://nodejs.org/api/fs.html)

---

## 📦 Key Libraries & Versions

### Frontend (`platform-ui`)
- **Next.js:** 15.3.4 (App Router)
- **React:** ^19.0.0
- **TypeScript:** ^5
- **Tailwind CSS:** ^4 (latest major version)
- **Radix UI:** ^1.x-^2.x (primitives)
- **Lucide React:** ^0.525.0
- **class-variance-authority:** ^0.7.1
- **tailwind-merge:** ^3.3.1
- **React Query:** ^5.81.5
- **Supabase:** ^2.50.3

### Backend (`orchestrator`)
- **Node.js:** 18+
- **Express:** ^4.18.3
- **Anthropic SDK:** ^0.55.1
- **Supabase-js:** ^2.39.7
- **simple-git:** ^3.23.0
- **dotenv:** ^16.4.5
- **CORS:** ^2.8.5

---

## ⚡️ Quick Start

1. **Clone the repo:**
   ```bash
   git clone <this-repo-url>
   cd ai-lp-generator-platform
   ```
2. **Install dependencies:**
   ```bash
   cd orchestrator && npm install
   cd ../platform-ui && npm install
   ```
3. **Configure environment:**
   - Set up `.env.local` in `platform-ui` with:
     ```env
     NEXT_PUBLIC_BACKEND_API_URL=http://localhost:8080
     ```
   - Set up `.env` in `orchestrator` with your Anthropic, Supabase, and other secrets.
4. **Run backend:**
   ```bash
   cd orchestrator && npm start
   ```
5. **Run frontend:**
   ```bash
   cd platform-ui && npm run dev
   ```
6. **Visit:** [http://localhost:3000](http://localhost:3000)

---

## 📝 Project History & Notes

- **Frontend**: Originally based on Fluc UI (from `platform-ui-2`), merged and refactored for App Router, Tailwind v3, and Radix UI.
- **Backend**: Orchestrator API, supports prompt submission, status polling, and deployment.
- **Removed:** All code sandbox/editor functionality for simplicity and performance.
- **Unified:** All code, config, and scripts are managed in this monorepo.

---

## 📄 License

MIT
