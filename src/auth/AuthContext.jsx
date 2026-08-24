import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import AuthContext from "./authContext";
import {
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  refreshSession,
} from "../api/authApi";
import {
  clearApiSession,
  setApiAccessToken,
  setApiRefreshHandler,
  setApiUnauthorizedHandler,
} from "../api/apiClient";

const AUTH_STORAGE_KEY = "cham.accessToken";

function getStoredToken() {
  return window.sessionStorage.getItem(AUTH_STORAGE_KEY);
}

function storeToken(token) {
  if (token) {
    window.sessionStorage.setItem(AUTH_STORAGE_KEY, token);
  } else {
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
  }
}

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(() => getStoredToken());
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("loading");

  const clearSession = useCallback(() => {
    storeToken(null);
    setAccessToken(null);
    setUser(null);
    clearApiSession();
    setStatus("anonymous");
  }, []);

  const applySession = useCallback((session) => {
    const token = session?.accessToken;

    if (!token) {
      clearSession();
      return null;
    }

    storeToken(token);
    setApiAccessToken(token);
    setAccessToken(token);

    if (session.email) {
      setUser({
        id: session.id,
        email: session.email,
        fullName: session.fullName,
        role: session.role,
      });
    }

    setStatus("authenticated");
    return token;
  }, [clearSession]);

  const refreshAccessToken = useCallback(async () => {
    const session = await refreshSession();
    const token = applySession(session);

    if (!token) {
      throw new Error("Refresh response did not include an access token.");
    }

    return token;
  }, [applySession]);

  useEffect(() => {
    setApiAccessToken(accessToken);
  }, [accessToken]);

  useEffect(() => {
    setApiRefreshHandler(refreshAccessToken);
    setApiUnauthorizedHandler(clearSession);

    return () => {
      setApiRefreshHandler(null);
      setApiUnauthorizedHandler(null);
    };
  }, [clearSession, refreshAccessToken]);

  useEffect(() => {
    let isMounted = true;

    async function hydrateSession() {
      const storedToken = getStoredToken();

      if (!storedToken) {
        try {
          await refreshAccessToken();
        } catch {
          if (isMounted) {
            clearSession();
          }
        }
        return;
      }

      setApiAccessToken(storedToken);

      try {
        const currentUser = await getCurrentUser();

        if (isMounted) {
          setUser(currentUser);
          setStatus("authenticated");
        }
      } catch {
        try {
          await refreshAccessToken();
        } catch {
          if (isMounted) {
            clearSession();
          }
        }
      }
    }

    hydrateSession();

    return () => {
      isMounted = false;
    };
  }, [clearSession, refreshAccessToken]);

  const login = useCallback(async (credentials) => {
    setStatus("loading");

    try {
      const session = await loginRequest(credentials);
      applySession(session);
      return session;
    } catch (error) {
      clearSession();
      throw error;
    }
  }, [applySession, clearSession]);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo(
    () => ({
      accessToken,
      user,
      status,
      isAuthenticated: status === "authenticated",
      isAdmin: user?.role === "ADMIN",
      login,
      logout,
      clearSession,
    }),
    [accessToken, user, status, login, logout, clearSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
