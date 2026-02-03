import Sidebar from "@/components/Sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-[1100px] mx-auto px-8 py-8 lg:px-10 lg:py-10 animate-page-in">
          {children}
        </div>
      </main>
    </div>
  );
}
