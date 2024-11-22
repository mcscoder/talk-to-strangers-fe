import { createBrowserRouter } from "react-router-dom";

export const createRouter = () =>
  createBrowserRouter([
    {
      path: "",
      lazy: async () => {
        const { AppLayout } = await import("src/components/layouts");
        return { Component: AppLayout };
      },
      children: [
        {
          path: "",
          lazy: async () => {
            const { HomeRoute } = await import("src/app/routes/home");
            return { Component: HomeRoute };
          },
        },
        {
          path: "chat",
          lazy: async () => {
            const { ChatRoute } = await import("src/app/routes/chat");
            return { Component: ChatRoute };
          },
        },
      ],
    },
  ]);
