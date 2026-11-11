
import { FileCheck2 } from 'lucide-react'

function Header() {
  return (
    <header className="w-full bg-[#F7F9FC]">
      <div className="mx-auto flex h-20 w-full max-w-7xl items-center px-5 sm:px-8 lg:px-10">
        <div className="flex items-center gap-3">
          <FileCheck2
            size={28}
            strokeWidth={2.2}
            className="text-[#17324D]"
          />

          <span className="text-xl font-bold text-[#17324D]">
            Action Guide
          </span>
        </div>
      </div>
    </header>
  )
}

export default Header
