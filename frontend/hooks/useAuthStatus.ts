import { useAuth } from "@/components/providers/AuthProvider";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";

/** @deprecated Prefer `useAuth()` from AuthProvider. */
const useAuthStatus = () => {
  const { sessionReady, isAuthenticated } = useAuth();
  const userLoggedIn = useSelector(
    (state: RootState) => state.auth.userLoggedIn,
  );

  return {
    userLoggedIn: userLoggedIn && isAuthenticated,
    sessionReady,
    csrfTokenExists: isAuthenticated,
  };
};

export default useAuthStatus;
