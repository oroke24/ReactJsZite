/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from "react";
import { onUserStateChange, logoutUser, reloadCurrentUser } from "../lib/auth";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onUserStateChange((u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

   const logout = async () => {
    await logoutUser();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, refreshUser: async () => {
      const u = await reloadCurrentUser();
      if (u) {
        // Force a re-render even if Firebase keeps the same object reference
        // by cloning the minimal fields we rely on.
        const cloned = { uid: u.uid, email: u.email, emailVerified: u.emailVerified };
        setUser(cloned);
        return cloned;
      }
      return u;
    } }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
