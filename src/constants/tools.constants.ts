import { IToolLogo } from '@/home-sections/Resume/types/resume.type'

/**
 * Every technology named in the CV that ships a recognisable logo, grouped the way the CV groups
 * its skills. Brand SVGs are pre-coloured for the dark-only theme, so no per-icon styling is needed.
 */
export const TOOL_LOGOS: IToolLogo[] = [
  // Languages and frontend core
  { id: 'typescript', title: 'TypeScript', src: '/assets/svg/tools/typescript.svg' },
  { id: 'javascript', title: 'JavaScript', src: '/assets/svg/tools/javascript.svg' },
  { id: 'react', title: 'React', src: '/assets/svg/tools/react.svg' },
  { id: 'nextjs', title: 'Next.js', src: '/assets/svg/tools/nextjs.svg' },
  { id: 'react-router', title: 'React Router', src: '/assets/svg/tools/react-router.svg' },
  // React Native ships no mark of its own - the React atom is its canonical logo.
  { id: 'react-native', title: 'React Native', src: '/assets/svg/tools/react.svg' },
  { id: 'vue', title: 'Vue', src: '/assets/svg/tools/vue.svg' },
  { id: 'nuxt', title: 'Nuxt', src: '/assets/svg/tools/nuxt.svg' },
  { id: 'astro', title: 'Astro', src: '/assets/svg/tools/astro.svg' },

  // State management
  { id: 'redux-toolkit', title: 'Redux Toolkit', src: '/assets/svg/tools/redux-toolkit.svg' },
  { id: 'mobx', title: 'MobX', src: '/assets/svg/tools/mobx.svg' },
  { id: 'zustand', title: 'Zustand', src: '/assets/img/tools/zustand.ico' },

  // UI and design systems
  { id: 'radix-ui', title: 'Radix UI', src: '/assets/svg/tools/radix-ui.svg' },
  // The Framer Motion mark is a 2:3 glyph; a square box would letterbox it.
  {
    id: 'framer-motion',
    title: 'Framer Motion',
    src: '/assets/svg/tools/framer-motion.svg',
    width: 27,
  },
  { id: 'sass', title: 'Sass', src: '/assets/svg/tools/sass.svg' },
  { id: 'html5', title: 'HTML5', src: '/assets/svg/tools/html5.svg' },
  { id: 'css3', title: 'CSS3', src: '/assets/svg/tools/css3.svg' },

  // Forms and validation
  { id: 'react-hook-form', title: 'React Hook Form', src: '/assets/img/tools/react-hook-form.png' },
  { id: 'zod', title: 'Zod', src: '/assets/svg/tools/zod.svg' },

  // Real-time
  { id: 'webrtc', title: 'WebRTC', src: '/assets/svg/tools/webrtc.svg' },
  { id: 'livekit', title: 'LiveKit', src: '/assets/svg/tools/livekit.svg' },

  // Testing
  { id: 'jest', title: 'Jest', src: '/assets/svg/tools/jest.svg' },
  { id: 'vitest', title: 'Vitest', src: '/assets/svg/tools/vitest.svg' },
  { id: 'testing-library', title: 'Testing Library', src: '/assets/svg/tools/testing-library.svg' },
  { id: 'playwright', title: 'Playwright', src: '/assets/svg/tools/playwright.svg' },
  { id: 'cypress', title: 'Cypress', src: '/assets/img/tools/cypress.png' },

  // Backend and data
  { id: 'nodejs', title: 'Node.js', src: '/assets/svg/tools/nodejs.svg' },
  { id: 'express', title: 'Express', src: '/assets/svg/tools/express.svg' },
  { id: 'nestjs', title: 'NestJS', src: '/assets/svg/tools/nestjs.svg' },
  { id: 'prisma', title: 'Prisma', src: '/assets/svg/tools/prisma.svg' },
  { id: 'postgresql', title: 'PostgreSQL', src: '/assets/svg/tools/postgresql.svg' },
  { id: 'mongodb', title: 'MongoDB', src: '/assets/svg/tools/mongodb.svg' },
  { id: 'redis', title: 'Redis', src: '/assets/svg/tools/redis.svg' },
  { id: 'strapi', title: 'Strapi', src: '/assets/svg/tools/strapi.svg' },

  // Build and tooling
  { id: 'vite', title: 'Vite', src: '/assets/svg/tools/vite.svg' },
  { id: 'webpack', title: 'Webpack', src: '/assets/svg/tools/webpack.svg' },
  { id: 'babel', title: 'Babel', src: '/assets/svg/tools/babel.svg' },
  { id: 'eslint', title: 'ESLint', src: '/assets/svg/tools/eslint.svg' },
  { id: 'prettier', title: 'Prettier', src: '/assets/svg/tools/prettier.svg' },
  { id: 'stylelint', title: 'Stylelint', src: '/assets/svg/tools/stylelint.svg' },
  { id: 'postcss', title: 'PostCSS', src: '/assets/svg/tools/postcss.svg' },
  { id: 'pnpm', title: 'pnpm', src: '/assets/svg/tools/pnpm.svg' },

  // Observability
  { id: 'sentry', title: 'Sentry', src: '/assets/svg/tools/sentry.svg' },
  { id: 'elasticsearch', title: 'Elasticsearch', src: '/assets/svg/tools/elasticsearch.svg' },
  { id: 'datadog', title: 'Datadog', src: '/assets/svg/tools/datadog.svg' },

  // DevOps
  { id: 'docker', title: 'Docker', src: '/assets/svg/tools/docker.svg' },
  { id: 'git', title: 'Git', src: '/assets/svg/tools/git.svg' },
  { id: 'nginx', title: 'NGINX', src: '/assets/svg/tools/nginx.svg' },

  // Design and delivery
  { id: 'figma', title: 'Figma', src: '/assets/svg/tools/figma.svg' },
  { id: 'jira', title: 'Jira', src: '/assets/svg/tools/jira.svg' },
  { id: 'swagger', title: 'Swagger', src: '/assets/svg/tools/swagger.svg' },
]
