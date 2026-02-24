import { Sidebar, MobileSidebar } from '@/components/sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="lg:hidden flex items-center gap-3 border-b bg-sidebar px-4 py-3">
          <MobileSidebar />
          <span className="font-semibold text-primary font-[family-name:var(--font-montserrat)]">
            EOS L10
          </span>
        </header>
        <main className="flex-1 overflow-y-auto bg-muted p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
