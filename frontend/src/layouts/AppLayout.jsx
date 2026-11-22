
import Header from '../components/Header'
import Footer from '../components/Footer'

// Layout for pages after login (content starts at the top, not centred)
function AppLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">

      <Header />

      <main className="flex-1 bg-white px-4 py-10 sm:px-6 sm:py-12">
        <div className="mx-auto w-full max-w-3xl">
          {children}
        </div>
      </main>

      <Footer />

    </div>
  )
}

export default AppLayout
