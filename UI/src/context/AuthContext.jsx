import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiCall from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  // Authentication state validated strictly from server session
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const clearStorage = () => {
    try {
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('permissions');
      sessionStorage.removeItem('userType');
      sessionStorage.removeItem('userName');
      sessionStorage.removeItem('userId');
      sessionStorage.removeItem('userEmail');
      sessionStorage.removeItem('profileImage');
      sessionStorage.removeItem('universityId');
      sessionStorage.removeItem('subjectId1');
    } catch (e) {}
  };

  const fetchUserPermissions = async (userData) => {
    if (userData?.permissions && Array.isArray(userData.permissions) && userData.permissions.length > 0) {
      setPermissions(userData.permissions);
      return userData.permissions;
    }

    if (!userData || !userData.userType) return [];
    try {
      const response = await apiCall('/role/my-permissions', { hideErrorToast: true, ignoreAuthRedirect: true });
      if (response && response.success && response.data) {
        const perms = Array.isArray(response.data) ? response.data : [];
        setPermissions(perms);
        return perms;
      }
    } catch (e) {
      console.warn('Failed to fetch user permissions:', e);
    }
    return [];
  };

  const fetchUserData = useCallback(async () => {
    try {
      // Validates session against backend via HttpOnly cookie
      const userData = await apiCall('/users/me', { ignoreAuthRedirect: true, hideErrorToast: true });
      if (userData && userData.id) {
        setUser(userData);
        if (userData.permissions && Array.isArray(userData.permissions)) {
          setPermissions(userData.permissions);
        } else {
          await fetchUserPermissions(userData);
        }
        setError(null);
      } else {
        setUser(null);
        setPermissions([]);
        clearStorage();
      }
    } catch (err) {
      setUser(null);
      setPermissions([]);
      clearStorage();
    } finally {
      setLoading(false);
    }
  }, []);

  // Validate session against server on app initialization
  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiCall('/auth/login', {
        method: 'POST',
        body: { email, password }
      });

      const userObj = response.user;
      if (response.token) {
        localStorage.setItem('token', response.token);
        sessionStorage.setItem('token', response.token);
      }
      setUser(userObj);

      if (userObj?.permissions && Array.isArray(userObj.permissions)) {
        setPermissions(userObj.permissions);
      } else {
        await fetchUserPermissions(userObj);
      }
      
      return response;
    } catch (err) {
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiCall('/auth/logout', { method: 'POST', hideErrorToast: true, ignoreAuthRedirect: true });
    } catch (e) {
      // Ignore network errors on logout
    }

    clearStorage();
    setUser(null);
    setPermissions([]);
    setError(null);
    window.location.href = '/login';
  };

  const refreshUser = async () => {
    await fetchUserData();
  };

  const hasPermission = (permissionName) => {
    if (!user) return false;

    // Admin has full permissions
    if (user.userType?.toLowerCase() === 'admin') return true;

    
    // Check permissions loaded from the database Roles table for this user's role
    if (permissions && permissions.length > 0) {
      return permissions.some(p => p.toLowerCase() === permissionName?.toLowerCase());
    }
    return false;
  };

  const value = {
    user,
    permissions,
    hasPermission,
    loading,
    error,
    login,
    logout,
    refreshUser,
    updateUser: (userData) => {
      setUser(userData);
    },
    isAuthenticated: !!user,
    userType: user?.userType,
    userId: user?.id,
    userName: user?.name,
    userEmail: user?.email,
    profileImage: user?.profileImage,
    universityId: user?.universityId,
    subjectId1: user?.subjectId1
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
