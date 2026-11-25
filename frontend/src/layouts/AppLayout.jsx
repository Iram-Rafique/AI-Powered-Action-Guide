import Header from '../components/Header'
import Footer from '../components/Footer'

// Layout for pages after login (content starts at the top, not centred).
// Pass wide to give a page more room, e.g. My Documents with its summary strip.
function AppLayout({ children, wide = false }) {
  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <Header />

      <main className="flex-1 px-4 py-10 sm:px-6 sm:py-12">
        <div className={`mx-auto w-full ${wide ? 'max-w-5xl' : 'max-w-3xl'}`}>
          {children}
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default AppLayout