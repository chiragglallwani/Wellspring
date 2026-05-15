import SessionsPage from "@/views/SessionsPage";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { RequireAuth } from "@/components/auth/RequireAuth";

export default function SessionsRoutePage() {
  return (
    <RequireAuth>
    <div className="min-h-screen bg-background text-foreground font-sans antialiased">
      <Sidebar />
      <Header />
      <main className="ml-[280px] min-h-[calc(100vh-64px)] p-10">
        <div className="max-w-[1440px] mx-auto">
          <SessionsPage />
        </div>
      </main>
    </div>
    </RequireAuth>
  );
}
