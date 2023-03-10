# Portfolio

Site: https://ruchern.xyz

- Framework: [Next.js](https://nextjs.org)
- Deployment: [Vercel](https://vercel.com)
- CMS: [Sanity](https://sanity.io)
- Styling: [Tailwind CSS](https://tailwindcss.com)

## TODO

Portfolio site is now going into maintenance mode and will stop developing new features. Main goal is to clean up, optimise and prepare to migrate to use the `/app` directory.

- [ ] Tidy up the components
- [x] Remove all the remaining feature flags that are currently disabled on production
- [ ] Complete writing the remaining drafts that are scheduled

## Overview

- `lib/*` - Collection of utilities and helpers
- `pages/api` - [API Routes](https://nextjs.org/docs/api-routes/introduction)
- `pages/` - Static pages
- `pages/sitemap.xml.tsx` - Sitemap
- `pages/feed.xml.tsx` - RSS feed
- `public/` - Static assets such as fonts, images, and icons
- `styles/` - Basically global style from Tailwind CSS and Prism language highlighting

## Installation

```bash
# Cloning the repository
git clone https://github.com/ruchernchong/portfolio.git

# Change directory
cd portfolio

# Installing npm packages
pnpm i

# Run the development server
pnpm dev

# Setting environment variables
cp .env.local.example .env.local
```
