import Nav from '@/components/marketing/Nav'
import Hero from '@/components/marketing/Hero'
import Logos from '@/components/marketing/Logos'
import Features from '@/components/marketing/Features'
import Pricing from '@/components/marketing/Pricing'
import CTA from '@/components/marketing/CTA'
import Footer from '@/components/marketing/Footer'

export default function MarketingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <Nav />
      <main id="main">
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
