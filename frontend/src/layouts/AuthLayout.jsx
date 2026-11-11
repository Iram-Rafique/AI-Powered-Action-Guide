
import Header from '../components/Header'
import Footer from '../components/Footer'

function AuthLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">

      {/* Separate Header */}
      <Header />

      {/* Main Page Content */}
      <main className="flex flex-1 items-center justify-center bg-white px-4 py-10 sm:px-6 sm:py-12">
        {children}
      </main>

      {/* Separate Footer */}
      <Footer />

    </div>
  )
}

export default AuthLayout
