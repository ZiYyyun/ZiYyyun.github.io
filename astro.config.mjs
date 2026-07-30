// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig, fontProviders } from 'astro/config';

import react from '@astrojs/react';

const githubOwner = process.env.GITHUB_REPOSITORY_OWNER;
const githubRepo = process.env.GITHUB_REPOSITORY?.split('/')[1];
const isProjectPage = githubRepo && !githubRepo.endsWith('.github.io');

// https://astro.build/config
export default defineConfig({
    site: process.env.SITE_URL ?? (githubOwner ? `https://${githubOwner}.github.io` : 'http://localhost:4321'),
    base: process.env.BASE_PATH ?? (isProjectPage ? `/${githubRepo}` : undefined),
    integrations: [mdx(), sitemap(), react()],
    fonts: [
        {
            provider: fontProviders.local(),
            name: 'Atkinson',
            cssVariable: '--font-atkinson',
            fallbacks: ['sans-serif'],
            options: {
                variants: [
                    {
                        src: ['./src/assets/fonts/atkinson-regular.woff'],
                        weight: 400,
                        style: 'normal',
                        display: 'swap',
                    },
                    {
                        src: ['./src/assets/fonts/atkinson-bold.woff'],
                        weight: 700,
                        style: 'normal',
                        display: 'swap',
                    },
                ],
            },
        },
    ],
});
