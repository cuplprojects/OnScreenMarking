import { createContext, useContext, useState, useEffect } from 'react';
import apiCall, { setSessionId, clearSessionId } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  // Session-based authentication backed by Redis with sessionStorage persistence
  const [user, setUser] = useState(() => {
    try {
      const stored = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('user') : null;
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [permissions, setPermissions] = useState(() => {
    try {
      const stored = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('permissions') : null;
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(() => {
    const hasToken = typeof sessionStorage !== 'undefined' && !!sessionStorage.getItem('token');
    const hasUser = typeof sessionStorage !== 'undefined' && !!sessionStorage.getItem('user');
    return !(hasToken && hasUser);
  });

  const [error, setError] = useState(null);

  const clearStorage = () => {
    try {
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

  const syncUserToStorage = (userData) => {
    if (!userData) return;
    try {
      sessionStorage.setItem('user', JSON.stringify(userData));
      if (userData.userType) sessionStorage.setItem('userType', userData.userType);
      if (userData.name) sessionStorage.setItem('userName', userData.name);
      if (userData.id) sessionStorage.setItem('userId', String(userData.id));
      if (userData.email) sessionStorage.setItem('userEmail', userData.email);
      if (userData.profileImage) sessionStorage.setItem('profileImage', userData.profileImage);
      if (userData.universityId) sessionStorage.setItem('universityId', String(userData.universityId));
      if (userData.subjectId1) sessionStorage.setItem('subjectId1', String(userData.subjectId1));
    } catch (e) {}
  };

  // Validate or refresh session on app initialization
  useEffect(() => {
    const token = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('token') : null;
    if (token) {
      setSessionId(token);
      fetchUserData();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUserPermissions = async (userData) => {
    if (userData?.permissions && Array.isArray(userData.permissions) && userData.permissions.length > 0) {
      setPermissions(userData.permissions);
      try {
        sessionStorage.setItem('permissions', JSON.stringify(userData.permissions));
      } catch (e) {}
      return userData.permissions;
    }

    if (!userData || !userData.userType) return [];
    try {
      const response = await apiCall('/role/my-permissions', { hideErrorToast: true, ignoreAuthRedirect: true });
      if (response && response.success && response.data) {
        const perms = Array.isArray(response.data) ? response.data : [];
        setPermissions(perms);
        try {
          sessionStorage.setItem('permissions', JSON.stringify(perms));
        } catch (e) {}
        return perms;
      }
    } catch (e) {
      console.error('Failed to fetch user permissions:', e);
    }
    return [];
  };

  const fetchUserData = async () => {
    try {
      if (!user && (typeof sessionStorage === 'undefined' || !sessionStorage.getItem('user'))) {
        setLoading(true);
      }
      // Validates session against backend using token header & cookie
      const userData = await apiCall('/users/me', { ignoreAuthRedirect: true, hideErrorToast: true });
      if (userData && userData.id) {
        setUser(userData);
        syncUserToStorage(userData);

        if (userData.permissions && Array.isArray(userData.permissions)) {
          setPermissions(userData.permissions);
          try {
            sessionStorage.setItem('permissions', JSON.stringify(userData.permissions));
          } catch (e) {}
        } else {
          await fetchUserPermissions(userData);
        }
        setError(null);
      } else {
        setUser(null);
        setPermissions([]);
        clearSessionId();
        clearStorage();
      }
    } catch (err) {
      if (err.message === 'Session expired') {
        setUser(null);
        setPermissions([]);
        clearSessionId();
        clearStorage();
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      if (response.token) {
        setSessionId(response.token);
      }
      
      // Set user data and permissions in React state and sessionStorage
      const userObj = response.user;
      setUser(userObj);
      syncUserToStorage(userObj);

      if (userObj?.permissions && Array.isArray(userObj.permissions)) {
        setPermissions(userObj.permissions);
        try {
          sessionStorage.setItem('permissions', JSON.stringify(userObj.permissions));
        } catch (e) {}
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

    clearSessionId();
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
    // Admin fallback
    if (user?.userType === 'admin') return true;

    // Coordinator fallback (grant default coordinator permissions)
    if (user?.userType === 'coordinator') {
      const coordinatorPerms = [
        "READ_SCRIPT", "READ_MARKING", "CREATE_MARKING", "UPDATE_MARKING", 
        "VIEW_REPORTS", "READ_ALLOCATION", "CREATE_ALLOCATION", "UPDATE_ALLOCATION", 
        "DELETE_ALLOCATION", "READ_USER", "READ_ROLE", "VIEW_LOGS"
      ];
      if (coordinatorPerms.includes(permissionName)) {
        return true;
      }
    }

    // Examiner fallback (grant default examiner permissions)
    if (user?.userType === 'examiner') {
      const examinerPerms = ["READ_SCRIPT", "READ_MARKING", "CREATE_MARKING", "UPDATE_MARKING", "VIEW_REPORTS", "READ_ALLOCATION"];
      if (examinerPerms.includes(permissionName)) {
        return true;
      }
    }

    if (permissions && permissions.length > 0) {
      return permissions.includes(permissionName);
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
      syncUserToStorage(userData);
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
