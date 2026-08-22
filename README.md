# Kaiferdata Platform

A modern, highly responsive platform for purchasing and managing mobile data bundles. Built with an intuitive user interface and a robust backend for handling automated order fulfillments, agent dashboards, and real-time data syncs.

## 🚀 Tech Stack
- **Frontend**: React 18, Vite, TypeScript
- **Styling**: Tailwind CSS, Shadcn UI (Radix UI), Framer Motion
- **State Management**: React Query (TanStack Query), React Hook Form, Zod
- **Backend & Database**: Supabase (PostgreSQL, Edge Functions, RPCs)
- **Routing**: React Router DOM

## ✨ Core Features
- **User Dashboard**: Seamless interface for purchasing data, managing wallet balances, and tracking order statuses.
- **Agent Portal**: Specialized wizard and dashboard for data agents to process bulk orders, track earnings, and manage express packages.
- **Admin Hub**: Comprehensive admin tools for package management, financial analytics, system settings, and user oversight.
- **Automated Fulfillment**: Edge Functions handle automatic routing to various suppliers (like DataBundlesHub and Afrohub) with intelligent fallback mechanisms.
- **Real-Time Sync**: Background cron jobs and status webhooks keep supplier order statuses perfectly synchronized with the local database.
- **Content Engine**: Built-in SEO-optimized blog platform and promotional modules.

## 🛠 Getting Started

### Prerequisites
- Node.js (v18+)
- Supabase CLI (for backend edge functions and migrations)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/Labarun/kaiferdata.git
   cd kaiferdata
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

### Edge Functions
If you need to deploy or update the background fulfillment functions:
```bash
npx supabase functions deploy
```

## 📦 Deployment
To build the frontend for production:
```bash
npm run build
```
This will compile the application and pre-render essential routes for SEO optimization.
