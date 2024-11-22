import { Outlet } from "react-router-dom";
import { AppHeader } from "src/components/layouts/app-layout/components";

export const AppLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-yellow-100">
      <AppHeader />
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
    </div>
  );
};
