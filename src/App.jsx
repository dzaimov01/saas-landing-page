import Nav from './components/Nav'
import Hero from './components/Hero'
import Logos from './components/Logos'
import Features from './components/Features'
import Pricing from './components/Pricing'
import CTA from './components/CTA'
import Footer from './components/Footer'

export default function App() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <Nav />
      <main>
        <Hero />
        <Logos />
        <Features />
        <Pricing />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}
