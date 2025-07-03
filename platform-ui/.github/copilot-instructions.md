# Copilot Instructions

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview
This is a Next.js 15 landing page builder application that generates AI-powered websites. The project uses:

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **Database**: Supabase (PostgreSQL)
- **AI Integration**: Fireworks AI API for landing page generation
- **Form Handling**: React Hook Form with Zod validation
- **State Management**: TanStack React Query
- **Icons**: Lucide React

## Code Guidelines
- Use TypeScript for all new files
- Follow Next.js App Router conventions (app directory structure)
- Use shadcn/ui components for consistent UI
- Implement proper error boundaries and loading states
- Use server components where possible for better performance
- Follow React best practices and hooks patterns
- Use Tailwind CSS for styling with semantic class names
- Implement proper SEO with Next.js metadata API

## File Structure
- `/src/app` - Next.js App Router pages and layouts
- `/src/components` - Reusable React components
- `/src/lib` - Utility functions and configurations
- `/src/services` - API service layers
- `/src/types` - TypeScript type definitions
- `/src/hooks` - Custom React hooks

## API Integration
- Use server actions for form submissions
- Implement proper error handling for external APIs
- Use environment variables for sensitive configurations
- Follow REST API conventions for data fetching
