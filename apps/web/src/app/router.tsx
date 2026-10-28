import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { HomeRoute } from "../routes/home.js";
import { AppLayout } from "./layout.js";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [{ index: true, element: <HomeRoute /> }],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
