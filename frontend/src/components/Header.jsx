
// import { FileCheck2 } from 'lucide-react'

// function Header() {
//   return (
//     <header className="w-full bg-[#D7DEE8]">
//       <div className="mx-auto flex h-20 w-full max-w-7xl items-center px-5 sm:px-8 lg:px-10">
//         <div className="flex items-center gap-3">
//           <FileCheck2
//             size={28}
//             strokeWidth={2.2}
//             className="text-[#17324D]"
//           />

//           <span className="text-xl font-bold text-[#17324D]">
//             Action Guide
//           </span>
//         </div>
//       </div>
//     </header>
//   )
// }

// export default Header
import { FileCheck2 } from 'lucide-react'

function Header() {
  return (
    <header className="w-full border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-20 w-full max-w-7xl items-center px-5 sm:px-8 lg:px-10">
        <div className="flex items-center gap-3">
          <FileCheck2
            size={28}
            strokeWidth={2.2}
            className="text-[#263746]"
          />

          <span className="text-xl font-bold text-[#263746]">
            Action Guide
          </span>
        </div>
      </div>
    </header>
  )
}

export default Header


// My final choice

// White

// #FFFFFF

// Header, cards and input fields.



// Dark Slate

// #263746

// Footer, headings and primary text.



// Teal

// #0F766E

// Buttons and important actions.