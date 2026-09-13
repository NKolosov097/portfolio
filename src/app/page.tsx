import Home from '@/home-sections/Home/Home'
import Portfolio from '@/home-sections/Portfolio/Portfolio'
import AboutMe from '@/home-sections/AboutMe/AboutMe'
import Resume from '@/home-sections/Resume/Resume'
import Writing from '@/home-sections/Writing/Writing'
import Contact from '@/home-sections/Contact/Contact'

export default function HomePage() {
  return (
    <>
      <Home />
      <Portfolio />
      <AboutMe />
      <Resume />
      <Writing />
      <Contact />
    </>
  )
}
