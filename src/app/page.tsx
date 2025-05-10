import { lazy } from 'react'

const Home = lazy(() => import('@/home-sections/Home/Home'))
const Portfolio = lazy(() => import('@/home-sections/Portfolio/Portfolio'))
const AboutMe = lazy(() => import('@/home-sections/AboutMe/AboutMe'))
const Resume = lazy(() => import('@/home-sections/Resume/Resume'))
const Contact = lazy(() => import('@/home-sections/Contact/Contact'))

export default async function HomePage() {
  return (
    <>
      <Home />
      <Portfolio />
      <AboutMe />
      <Resume />
      <Contact />
    </>
  )
}
