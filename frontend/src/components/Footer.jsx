
function Footer() {
  return (
    <footer className="w-full bg-[#F7F9FC]">
      <div className="mx-auto flex min-h-16 w-full max-w-7xl flex-col items-center justify-center gap-1 px-4 py-4 text-center text-sm text-black sm:flex-row sm:gap-2">
        <span>
          © {new Date().getFullYear()} Action Guide
        </span>

        <span className="hidden sm:inline">|</span>

        <span>
          AI-powered document assistance
        </span>
      </div>
    </footer>
  )
}

export default Footer
