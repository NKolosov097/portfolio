import { lazy } from 'react'

const Home = lazy(() => import('@/puk/Home/Home'))
const Portfolio = lazy(() => import('@/puk/Portfolio/Portfolio'))
const AboutMe = lazy(() => import('@/puk/AboutMe/AboutMe'))
const Resume = lazy(() => import('@/puk/Resume/Resume'))
const Contact = lazy(() => import('@/puk/Contact/Contact'))

// const getData = async () =>
//   await fetch(`http://localhost:3000/api/hello`)
//     .catch((err) => {
//       console.error(`Error with fetching data for home page: \n${err}`)
//     })
//     .then((res) => res?.json())
//     .catch((err) => {
//       console.error(`Error with transform data for the main page to json format: \n${err}`)
//     })

export default function HomePage() {
  // console.log(await getData())

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
