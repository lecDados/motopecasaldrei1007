import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { rolloverIfNeeded } from "@/lib/finance";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  useEffect(() => {
    rolloverIfNeeded();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="lg:pl-64">
        <div className="mx-auto max-w-[1400px] px-6 py-8 lg:px-10 lg:py-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
