import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, BookOpen, AlertCircle, Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login(email, password);

      // Route based on userType
      if (data.user.userType === 'admin') {
        navigate('/admin/dashboard');
      } else if (data.user.userType === 'coordinator') {
        navigate('/');
      } else {
        // examiner or other types
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Connection error. Please check if the API is running.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center mx-auto mb-4 shadow-lg">     
            <BookOpen className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">OSM Portal</h1>
          <p className="text-gray-600 text-sm mt-2">On-Screen Marking System</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="email"
                required
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="examiner@cbse.gov.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="password"
                required
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-2 rounded-lg transition-all duration-200 shadow-lg flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="animate-spin" size={20} />
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-600 mb-2">
            Are you a Student?{' '}
            <span
              onClick={() => navigate('/student-portal')}
              className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer transition-all hover:underline"
            >
              Access Student Portal
            </span>
          </p>
          <p className="text-sm text-gray-600 mb-2">
            Are you an Examiner?{' '}
            <span
              onClick={() => navigate('/register')}
              className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer transition-all hover:underline"
            >
              Register Here
            </span>
          </p>
          <p className="text-xs text-gray-500">
            Demo Credentials: examiner@uv.gov.in / password
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
