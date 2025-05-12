import { lazy, Suspense } from 'react'

import { LoaderSection } from '@/home-sections/LoaderSection/LoaderSection'

const Home = lazy(() => import('@/home-sections/Home/Home'))
const Portfolio = lazy(() => import('@/home-sections/Portfolio/Portfolio'))
const AboutMe = lazy(() => import('@/home-sections/AboutMe/AboutMe'))
const Resume = lazy(() => import('@/home-sections/Resume/Resume'))
const Contact = lazy(() => import('@/home-sections/Contact/Contact'))

export default async function HomePage() {
  return (
    <>
      <Suspense fallback={<LoaderSection />}>
        <Home />
      </Suspense>

      <Suspense fallback={<LoaderSection />}>
        <Portfolio />
      </Suspense>

      <Suspense fallback={<LoaderSection />}>
        <AboutMe />
      </Suspense>

      <Suspense fallback={<LoaderSection />}>
        <Resume />
      </Suspense>

      <Suspense fallback={<LoaderSection />}>
        <Contact />
      </Suspense>
    </>
  )
}
