import HeroBanner from './components/layout/HeroBanner'
import SocialBar from './components/layout/SocialBar'
import ChangeLogs from './components/news/ChangeLogs'
import NewsSection from './components/news/NewsSection'
import LoginBox from './components/auth/LoginBox'
import CharacterSearch from './components/layout/CharacterSearch'

export default function Home() {
  return (
    <div>
      {/* Hero Banner */}
      <HeroBanner />

      {/* Main Content - Two Columns */}
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Social Bar (includes Boosted Banner) */}
        <SocialBar />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Change Logs and Latest News */}
          <div className="lg:col-span-2 space-y-6">
            <ChangeLogs />
            <NewsSection />
          </div>

          {/* Right Column - Login and Character Search */}
          <div className="lg:col-span-1 space-y-6">
            <LoginBox />
            <CharacterSearch />
          </div>
        </div>
      </main>
    </div>
  )
}
