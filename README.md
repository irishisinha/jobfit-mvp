# JobFit MVP - AI-Powered Job Assessment Tool

An intelligent single-page application that analyzes how well a candidate's resume matches a job description using AI.

## Features

- 🔐 **Google OAuth Authentication** - Secure login with Google
- 🤖 **AI-Powered Analysis** - Uses Groq API (Mixtral 8x7b) for intelligent assessment
- 📊 **Comprehensive Metrics**
  - Fit Score (0-10)
  - ATS Match Probability (%)
  - Overall Success Probability (%)
  - Strengths & Gaps Analysis
  - Missing Keywords Identification
- 🎨 **Beautiful UI** - Modern, responsive design with TailwindCSS
- ⚡ **Fast & Lightweight** - Built with Next.js 14 and TypeScript

## Tech Stack

- **Frontend**: Next.js 14.2.35, React 18.2.0, TailwindCSS
- **Backend**: Next.js API Routes, TypeScript
- **Auth**: NextAuth.js v4.24.0 (Google OAuth)
- **AI**: Groq API (Mixtral 8x7b - FREE)
- **Deployment**: Vercel

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ installed
- Google OAuth credentials
- Groq API key

### 2. Get Your API Keys

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials (Web Application)
5. Add `http://localhost:3000/api/auth/callback/google` to authorized redirects
6. Copy your `CLIENT_ID` and `CLIENT_SECRET`

#### Groq API Key
1. Go to [console.groq.com](https://console.groq.com)
2. Sign up for free (you'll get FREE tier API access)
3. Create an API key

### 3. Environment Setup

Create `.env.local` file in the project root:

```env
GROQ_API_KEY=your_groq_api_key_here
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=http://localhost:3000
```

Generate `NEXTAUTH_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` in your browser.

### 6. Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
jobfit-mvp/
├── src/
│   ├── app/
│   │   ├── page.tsx                 # Login page
│   │   ├── layout.tsx               # Root layout with SessionProvider
│   │   ├── globals.css              # Global styles
│   │   ├── assessment/
│   │   │   └── page.tsx             # Assessment page (protected)
│   │   └── api/
│   │       ├── auth/
│   │       │   └── [...nextauth]/
│   │       │       └── route.ts     # NextAuth configuration
│   │       └── assess.ts            # Job fit assessment endpoint
│   └── lib/
│       ├── groq.js                  # Groq API wrapper
│       └── prompts.js               # System prompts for AI
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── next.config.js
└── .env.local                       # Environment variables (not in git)
```

## How It Works

1. **User Login**: Google OAuth redirects to assessment page
2. **Input**: User pastes resume and job description
3. **Analysis**: AI analyzes both texts using Groq API (Mixtral)
4. **Results**: Displays:
   - Verdict (Strong/Moderate/Weak Fit)
   - Fit Score (0-10)
   - ATS Match %
   - Success Probability %
   - Strengths (what matches)
   - Gaps (what's missing)
   - Missing Keywords (for resume optimization)

## Deployment to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial JobFit MVP commit"
git remote add origin https://github.com/YOUR_USERNAME/jobfit-mvp.git
git branch -M main
git push -u origin main
```

### 2. Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Or connect your GitHub repo to [Vercel Dashboard](https://vercel.com/dashboard).

### 3. Add Environment Variables in Vercel Dashboard

Settings → Environment Variables:
- `GROQ_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL=https://your-vercel-url.vercel.app`

## Features to Add Later

- [ ] Resume file upload (PDF/DOCX parsing)
- [ ] Multiple assessments history
- [ ] Detailed skill gap training recommendations
- [ ] Resume optimization suggestions
- [ ] Salary expectations analysis
- [ ] Interview preparation tips
- [ ] Email results to user

## API Documentation

### POST `/api/assess`

**Authentication**: Requires NextAuth session

**Request Body**:
```json
{
  "resume": "string",
  "jobDescription": "string"
}
```

**Response**:
```json
{
  "verdict": "Strong Fit | Moderate Fit | Weak Fit",
  "fitScore": 0-10,
  "atsMatch": 0-100,
  "successProbability": 0-100,
  "strengths": ["string"],
  "gaps": ["string"],
  "missingKeywords": ["string"]
}
```

## Troubleshooting

### "No provider found" error
- Ensure Google credentials are correct in `.env.local`
- Check redirect URI matches exactly

### "API limit exceeded" on Groq
- Free tier has usage limits
- Check [Groq Console](https://console.groq.com) for usage stats

### NextAuth session not persisting
- Ensure `NEXTAUTH_SECRET` is set
- Check `NEXTAUTH_URL` matches your domain

## License

MIT

## Support

For issues or feature requests, create a GitHub issue.
