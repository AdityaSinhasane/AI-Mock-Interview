import LoaderPage from "@/routes/loader-page";
import { useAuth } from "@clerk/clerk-react";
import type { ReactNode } from "react";
import { Navigate } from "react-router";

const ProtectedRoutes = ({children}: {children: ReactNode}) => {

  const {isLoaded, isSignedIn} = useAuth();

  if(!isLoaded){
    return <LoaderPage/>
  }

  if(!isSignedIn){
    return <Navigate to={'/signin'} replace/>
  }

  return children;
};

export default ProtectedRoutes;
