import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Lock, 
  Mail, 
  KeyRound, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  RefreshCw,
  ShieldCheck,
  BookOpen
} from 'lucide-react';
import authService from '../services/authService';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Email, 2: OTP & New Password, 3: Success

  // Form states
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  // Countdown timer for resend
  useEffect(() => {
    let timer;
    if (resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendTimer]);

  // Handle Step 1: Request OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Please provide a valid registered email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await authService.forgotPassword(email.trim());
      if (res && (res.success || res.message)) {
        setStep(2);
        setResendTimer(60); // 60s cooldown
      } else {
        setError(res?.message || 'Failed to send password reset code.');
      }
    } catch (err) {
      setError(err.message || 'Error sending password reset request. Please check email address.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Resend OTP
  const handleResendOtp = async () => {
    if (resendTimer > 0 || loading) return;
    setError('');
    setLoading(true);
    try {
      await authService.forgotPassword(email.trim());
      setResendTimer(60);
    } catch (err) {
      setError(err.message || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Step 2: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (!otp.trim()) {
      setError('Please enter the 6-digit verification code sent to your email.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify and try again.');
      return;
    }

    setLoading(true);
    try {
      const res = await authService.resetPassword(email.trim(), otp.trim(), newPassword);
      if (res && (res.success || res.message)) {
        setStep(3);
      } else {
        setError(res?.message || 'Failed to reset password. Please check your verification code.');
      }
    } catch (err) {
      setError(err.message || 'Failed to reset password. Please verify the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-700 via-teal-800 to-teal-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-6 md:p-8 border border-white/20 relative overflow-hidden">
        
        {/* Header Icon & Title */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-gradient-to-tr from-teal-600 to-teal-700 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-teal-700/20 text-white">
            <BookOpen size={28} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">OSM Portal</h1>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-1">Account Security & Recovery</p>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mb-5 bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-start gap-3 animate-in fade-in">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
            <p className="text-red-700 text-xs font-medium leading-relaxed">{error}</p>
          </div>
        )}

        {/* STEP 1: Enter Email */}
        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div className="bg-teal-50/60 border border-teal-100 rounded-xl p-3.5 text-xs text-teal-800 leading-relaxed">
              <span className="font-semibold block mb-0.5">Forgot your password?</span>
              Enter your registered portal email address below, and we will send you a 6-digit verification code.
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Registered Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="email"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50/50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all placeholder:text-gray-400"
                  placeholder="name@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 disabled:opacity-60 text-white text-sm font-bold py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="animate-spin" size={16} />
                  Sending Verification Code...
                </>
              ) : (
                'Send Verification Code'
              )}
            </button>

            <div className="pt-2 text-center">
              <Link to="/login" className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800 transition-colors">
                <ArrowLeft size={14} /> Back to Sign In
              </Link>
            </div>
          </form>
        )}

        {/* STEP 2: Enter OTP & New Password */}
        {step === 2 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-800 flex items-start gap-2.5">
              <ShieldCheck size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Code sent successfully!</p>
                <p className="text-gray-600 mt-0.5">We sent a 6-digit code to <strong className="text-gray-800">{email}</strong>.</p>
              </div>
            </div>

            {/* OTP Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">6-Digit Code</label>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendTimer > 0 || loading}
                  className="text-[11px] font-semibold text-teal-700 hover:text-teal-800 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
                </button>
              </div>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  maxLength={6}
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50/50 border border-gray-300 rounded-xl text-center text-lg font-mono font-bold tracking-widest text-teal-900 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all placeholder:text-gray-300"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  disabled={loading}
                />
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  className="w-full pl-10 pr-11 py-2.5 bg-gray-50/50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all placeholder:text-gray-400"
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  minLength={6}
                  className="w-full pl-10 pr-11 py-2.5 bg-gray-50/50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all placeholder:text-gray-400"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-[11px] text-red-500 font-medium mt-1">Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 disabled:opacity-60 text-white text-sm font-bold py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="animate-spin" size={16} />
                  Resetting Password...
                </>
              ) : (
                'Reset Password'
              )}
            </button>

            <div className="pt-2 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => { setStep(1); setError(''); }}
                className="font-medium text-gray-500 hover:text-gray-700 transition-colors"
              >
                Change Email
              </button>
              <Link to="/login" className="font-semibold text-teal-700 hover:text-teal-800 transition-colors">
                Back to Sign In
              </Link>
            </div>
          </form>
        )}

        {/* STEP 3: Success Screen */}
        {step === 3 && (
          <div className="text-center py-4 space-y-4">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner border border-emerald-100">
              <CheckCircle2 size={36} />
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900">Password Reset Complete!</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed max-w-xs mx-auto">
                Your password has been successfully updated. You can now use your new credentials to sign into the OSM portal.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white text-sm font-bold py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer"
            >
              Proceed to Sign In
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

