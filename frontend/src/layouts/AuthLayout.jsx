import Header from '../components/Header'
import Footer from '../components/Footer'

// Layout for the register and login pages (content centred on the page)
function AuthLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <Header />

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 sm:py-12">
        {children}
      </main>

      <Footer />
    </div>
  )
}

export default AuthLayout
