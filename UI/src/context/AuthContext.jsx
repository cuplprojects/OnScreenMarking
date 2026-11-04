import { createContext, useContext, useState, useEffect } from 'react';
import apiCall, { setSessionId, clearSessionId } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  // Pure session-based authentication backed by Redis.
  // Nothing is stored in browser sessionStorage or localStorage.
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Validate session on app initialization
  useEffect(() => {
    cleanLegacyStorage();
    fetchUserData();
  }, []);

  const cleanLegacyStorage = () => {
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
      console.error('Failed to fetch user permissions:', e);
    }
    return [];
  };

  const fetchUserData = async () => {
    try {
      setLoading(true);
      // Validates HttpOnly cookie session directly against Redis on backend
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
      }
    } catch (err) {
      // 401 on initial load simply means unauthenticated (guest / logged out)
      setUser(null);
      setPermissions([]);
      clearSessionId();
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

      // Session ID stored in memory & HttpOnly cookie set by server; zero storage in sessionStorage
      if (response.token) {
        setSessionId(response.token);
      }
      cleanLegacyStorage();
      
      // Set user data and permissions in React state
      setUser(response.user);
      if (response.user?.permissions && Array.isArray(response.user.permissions)) {
        setPermissions(response.user.permissions);
      } else {
        await fetchUserPermissions(response.user);
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
    cleanLegacyStorage();
    
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
    updateUser: (userData) => setUser(userData),
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
