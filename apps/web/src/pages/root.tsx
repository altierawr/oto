import { HelmetProvider } from "react-helmet-async";
import { Outlet } from "react-router";

const Root = () => {
  return (
    <HelmetProvider>
      <Outlet />
    </HelmetProvider>
  );
};

export default Root;
