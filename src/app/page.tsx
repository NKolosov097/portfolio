import { lazy } from 'react'

const Home = lazy(() => import('@/home-sections/Home/Home'))
const Portfolio = lazy(() => import('@/home-sections/Portfolio/Portfolio'))
const AboutMe = lazy(() => import('@/home-sections/AboutMe/AboutMe'))
const Resume = lazy(() => import('@/home-sections/Resume/Resume'))
const Contact = lazy(() => import('@/home-sections/Contact/Contact'))

const getData = async () =>
  await fetch(`http://localhost:3000/api/hello`)
    .catch((err) => {
      console.error(`Error with fetching data for home page: \n${err}`)
    })
    .then((res) => res?.json())
    .catch((err) => {
      console.error(`Error with transform data for the main page to json format: \n${err}`)
    })

export default async function HomePage() {
  console.log(await getData())

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
