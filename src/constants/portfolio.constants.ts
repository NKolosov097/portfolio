import { IProject } from '@/home-sections/Portfolio/types/portfolio.type'

export const PROJECTS: IProject[] = [
  {
    id: 'clinical-cases',
    img: 'https://opengraph.githubassets.com/1/NKolosov097/clinical-cases',
    href: 'https://github.com/NKolosov097/clinical-cases',
    descriptionKey: 'portfolio.projects.clinical-cases.description',
    tags: [
      { id: 'clinical-cases-nextjs', title: 'Next.js 16' },
      { id: 'clinical-cases-fastapi', title: 'FastAPI' },
      { id: 'clinical-cases-postgresql', title: 'PostgreSQL' },
      { id: 'clinical-cases-gemini', title: 'Gemini' },
    ],
  },
  {
    id: 'nk-meet',
    img: 'https://opengraph.githubassets.com/1/NKolosov097/nk-meet',
    href: 'https://github.com/NKolosov097/nk-meet',
    descriptionKey: 'portfolio.projects.nk-meet.description',
    tags: [
      { id: 'nk-meet-react-native', title: 'React Native' },
      { id: 'nk-meet-expo-router', title: 'Expo Router' },
      { id: 'nk-meet-typescript', title: 'TypeScript' },
      { id: 'nk-meet-livekit', title: 'LiveKit' },
    ],
  },
  {
    id: 'protein-web',
    img: 'https://opengraph.githubassets.com/1/NKolosov097/protein-web',
    href: 'https://NKolosov097.github.io/protein-web/',
    descriptionKey: 'portfolio.projects.protein-web.description',
    tags: [
      { id: 'protein-web-javascript', title: 'JavaScript' },
      { id: 'protein-web-python', title: 'Python' },
      { id: 'protein-web-fastapi', title: 'FastAPI' },
      { id: 'protein-web-3dmol', title: '3Dmol.js' },
    ],
  },
  {
    id: 'auth-service',
    img: 'https://opengraph.githubassets.com/1/NKolosov097/auth-service',
    href: 'https://github.com/NKolosov097/auth-service',
    descriptionKey: 'portfolio.projects.auth-service.description',
    tags: [
      { id: 'auth-service-go', title: 'Go' },
      { id: 'auth-service-postgresql', title: 'PostgreSQL' },
      { id: 'auth-service-jwt', title: 'JWT' },
      { id: 'auth-service-oauth2', title: 'OAuth2' },
    ],
  },
]
