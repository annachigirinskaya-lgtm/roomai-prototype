import './globals.css';
import Link from 'next/link';
export const metadata={title:'RoomAI Shop',description:'AI interior design with real products and real budgets'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><header className="bg-white border-b border-stone-200"><div className="shell py-4 flex justify-between items-center"><Link href="/" className="text-xl font-semibold">RoomAI Shop</Link><nav className="flex gap-4 text-sm"><Link href="/dashboard">Dashboard</Link><Link href="/new-project">Create</Link><Link href="/pricing">Pricing</Link></nav></div></header><main className="shell py-8">{children}</main></body></html>}
