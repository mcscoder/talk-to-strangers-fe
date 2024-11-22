import { useMemo } from "react";
import { RouterProvider } from "react-router-dom";
import { AppProvider } from "src/app/app-provider";
import { createRouter } from "src/app/router";

const AppRouter = () => {
  const router = useMemo(() => createRouter(), []);
  return <RouterProvider router={router} />;
};

function App() {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  );
}

export default App;
