import { IProject } from '@/home-sections/Portfolio/types/portfolio.type'

export const PROJECTS: IProject[] = [
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
  {
    id: 'golang-todo-app',
    img: 'https://opengraph.githubassets.com/1/NKolosov097/golang-todo-app',
    href: 'https://github.com/NKolosov097/golang-todo-app',
    descriptionKey: 'portfolio.projects.golang-todo-app.description',
    tags: [
      { id: 'golang-todo-app-go', title: 'Go' },
      { id: 'golang-todo-app-postgresql', title: 'PostgreSQL' },
      { id: 'golang-todo-app-docker', title: 'Docker' },
      { id: 'golang-todo-app-rest-api', title: 'REST API' },
    ],
  },
]
