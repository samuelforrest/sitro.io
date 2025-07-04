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

## 🖥️ Frontend: `/platform-ui`

- **Framework:** [Next.js 15 (App Router)](https://nextjs.org/)
- **Language:** TypeScript
- **Styling:** [Tailwind CSS v3.4.x](https://tailwindcss.com/) (with custom gradients, modern utility classes)
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
- **Next.js:** 15.x (App Router)
- **React:** 18.x
- **Tailwind CSS:** 3.4.x
- **Radix UI:** 1.x (primitives only)
- **Lucide React:** 0.367.x
- **class-variance-authority:** 0.7.x
- **tailwind-merge:** 2.x

### Backend (`orchestrator`)
- **Node.js:** 18+
- **Express:** 4.x
- **Anthropic SDK:** 0.19.x
- **Supabase-js:** 2.x
- **simple-git:** 3.x
- **dotenv:** 16.x

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
