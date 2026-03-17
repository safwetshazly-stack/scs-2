import { Navbar } from '@/components/layout/Navbar'
import { HeroSection } from '@/components/sections/HeroSection'
import { FeaturesSection } from '@/components/sections/FeaturesSection'
import { CommunitiesSection } from '@/components/sections/CommunitiesSection'
import { CoursesSection } from '@/components/sections/CoursesSection'
import { AISection } from '@/components/sections/AISection'
import { StatsSection } from '@/components/sections/StatsSection'
import { TestimonialsSection } from '@/components/sections/TestimonialsSection'
import { CTASection } from '@/components/sections/CTASection'
import { Footer } from '@/components/layout/Footer'

export default function HomePage() {
  return (
    <main className="overflow-x-hidden">
      <Navbar />
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <CommunitiesSection />
      <CoursesSection />
      <AISection />
      <TestimonialsSection />
      <CTASection />
      <Footer />
    </main>
  )
}
