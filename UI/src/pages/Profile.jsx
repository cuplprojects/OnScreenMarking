import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  User, 
  Mail, 
  Phone, 
  Shield, 
  Building, 
  MapPin, 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  Layers, 
  BookOpen, 
  Calendar,
  AlertCircle,
  FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import userService from '../services/userService';
import subjectService from '../services/subjectService';
import { useBreadcrumb } from '../context/BreadcrumbContext';

export default function Profile() {
  const [searchParams] = useSearchParams();
  const queryUserId = searchParams.get('userId');
  const { user: currentUser, userType } = useAuth();
  const { setBreadcrumb } = useBreadcrumb();

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    // Set breadcrumbs dynamically
    const parentPath = userType === 'admin' ? '/admin/dashboard' : userType === 'coordinator' ? '/coordinator/dashboard' : '/';
    setBreadcrumb([
      { label: 'Profile', path: '/profile', icon: 'User' }
    ]);
  }, [userType]);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError('');
      try {
        if (queryUserId) {
          const fetchedUser = await userService.getUserById(queryUserId);
          setProfileData(fetchedUser);
        } else {
          setProfileData(currentUser);
        }
      } catch (err) {
        setError(err.message || 'Failed to load user profile information.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [queryUserId, currentUser]);

  useEffect(() => {
    const fetchSubjects = async () => {
      if (!profileData?.universityId) return;
      try {
        const data = await subjectService.getSubjectByUniversity(profileData.universityId);
        setSubjects(data);
      } catch (err) {
        console.error("Failed to load subjects:", err);
      }
    };
    if (profileData) {
      fetchSubjects();
    }
  }, [profileData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div>
        <p className="text-slate-500 font-bold text-xs uppercase tracking-wider animate-pulse">Loading Profile Workspace...</p>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <div className="bg-white border border-red-100 rounded-2xl p-6 shadow-sm max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-1">Profile Resolution Error</h3>
          <p className="text-xs text-slate-500 mb-4">{error || 'User not found in system.'}</p>
          <Link to="/" className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all uppercase tracking-wider">
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const isCoordinator = profileData.userType === 'coordinator';
  const isAdmin = profileData.userType === 'admin';
  const isExaminer = profileData.userType === 'examiner' || (!isCoordinator && !isAdmin);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12 w-full px-4 lg:px-8">
      
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Link to={userType === 'admin' ? '/admin/users' : userType === 'coordinator' ? '/users' : '/'} className="p-2 bg-white border border-slate-100 hover:bg-slate-50 rounded-xl transition-all shadow-sm">
            <ArrowLeft size={16} className="text-slate-600" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {queryUserId ? `${profileData.name}'s Profile` : 'My Profile Workspace'}
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">Secure system evaluation identity card</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        
        {/* LEFT COLUMN - USER CARD & BIO */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          
          {/* Main Profile Identity Card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="h-28 bg-gradient-to-r from-blue-600 to-blue-600 relative">
              <span className="absolute top-4 right-4 bg-white  text-white border border-white/10 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                {profileData.userType || 'Examiner'}
              </span>
            </div>
            <div className="px-5 pb-6 text-center relative -mt-12">
              <div className="w-24 h-24 bg-white p-1 rounded-full shadow-lg border border-slate-100 mx-auto overflow-hidden flex items-center justify-center">
                {profileData.profileImage ? (
                  <img src={profileData.profileImage} alt={profileData.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-400">
                    <User size={36} />
                  </div>
                )}
              </div>
              
              <h2 className="text-sm font-bold text-slate-900 mt-3 leading-tight">{profileData.name}</h2>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{profileData.email}</p>
              
              {/* Performance Indicator (If Examiner) */}
              {isExaminer && (
                <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-center gap-6">
                  <div className="text-center">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none block">Status</span>
                    <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
                      Verified
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Details Sidebar Info */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Account Metadata</h3>
            
            <div className="flex items-center gap-3 border-b border-slate-50 pb-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Shield size={14} />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider leading-none">Security Level</span>
                <p className="text-xs font-bold text-slate-800 capitalize mt-0.5">{profileData.userType || 'Standard'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 border-b border-slate-50 pb-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Building size={14} />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider leading-none">Affiliation Scope</span>
                <p className="text-xs font-bold text-slate-800 truncate mt-0.5">
                  {profileData.university?.universityName || profileData.universityName || 'System Board'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <MapPin size={14} />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider leading-none">Location Details</span>
                <p className="text-xs font-bold text-slate-800 truncate mt-0.5">{profileData.address || 'Not Provided'}</p>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN - DETAILED WORKSPACE CARD */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          
          {/* Complete Profile Identity Details */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3 mb-5">
              Personal Information & Context
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div>
                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider leading-none block mb-1">Full Legal Name</span>
                <p className="text-xs font-bold text-slate-800 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 flex items-center gap-2">
                  <User size={14} className="text-slate-400" />
                  {profileData.name}
                </p>
              </div>

              <div>
                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider leading-none block mb-1">Email Communication</span>
                <p className="text-xs font-bold text-slate-800 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 flex items-center gap-2">
                  <Mail size={14} className="text-slate-400" />
                  {profileData.email}
                </p>
              </div>

              <div>
                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider leading-none block mb-1">Phone Number</span>
                <p className="text-xs font-bold text-slate-800 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 flex items-center gap-2">
                  <Phone size={14} className="text-slate-400" />
                  {profileData.phone || 'No registered phone number'}
                </p>
              </div>

              {profileData.fname && (
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider leading-none block mb-1">Official Legal Name</span>
                  <p className="text-xs font-bold text-slate-800 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 flex items-center gap-2">
                    <User size={14} className="text-slate-400" />
                    {profileData.fname}
                  </p>
                </div>
              )}

              {profileData.empId && (
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider leading-none block mb-1">Employee ID</span>
                  <p className="text-xs font-bold text-slate-800 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 flex items-center gap-2 font-mono">
                    <Building size={14} className="text-slate-400" />
                    {profileData.empId}
                  </p>
                </div>
              )}

              {profileData.collegeId && (
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider leading-none block mb-1">College Identification ID</span>
                  <p className="text-xs font-bold text-slate-800 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 flex items-center gap-2 font-mono">
                    <Building size={14} className="text-slate-400" />
                    {profileData.collegeId}
                  </p>
                </div>
              )}

              {profileData.aadharNo && (
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider leading-none block mb-1">Aadhar Verification Number</span>
                  <p className="text-xs font-bold text-slate-800 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 flex items-center gap-2 font-mono">
                    <Shield size={14} className="text-slate-400" />
                    {profileData.aadharNo.replace(/.(?=.{4})/g, "X")}
                  </p>
                </div>
              )}

              {profileData.panNo && (
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider leading-none block mb-1">PAN Taxation Number</span>
                  <p className="text-xs font-bold text-slate-800 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 flex items-center gap-2 font-mono uppercase">
                    <Shield size={14} className="text-slate-400" />
                    {profileData.panNo.replace(/.(?=.{3})/g, "X")}
                  </p>
                </div>
              )}

              {profileData.experience && (
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider leading-none block mb-1">Teaching/Evaluation Experience</span>
                  <p className="text-xs font-bold text-slate-800 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 flex items-center gap-2">
                    <Layers size={14} className="text-slate-400" />
                    {profileData.experience}
                  </p>
                </div>
              )}

              {profileData.subjectId1 && (
                <div className="col-span-1 md:col-span-2">
                  <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider leading-none block mb-1">Registered Subject Areas</span>
                  <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 text-xs font-medium space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-semibold">Primary Specialization:</span>
                      <span className="font-bold text-slate-800">
                        {subjects.find(s => s.subjectId === profileData.subjectId1)?.subName || `Subject #${profileData.subjectId1}`}
                      </span>
                    </div>
                    {profileData.subjectId2 && (
                      <div className="flex items-center justify-between border-t border-slate-100/50 pt-2">
                        <span className="text-slate-500 font-semibold">Secondary Scope:</span>
                        <span className="font-bold text-slate-800">
                          {subjects.find(s => s.subjectId === profileData.subjectId2)?.subName || `Subject #${profileData.subjectId2}`}
                        </span>
                      </div>
                    )}
                    {profileData.subjectId3 && (
                      <div className="flex items-center justify-between border-t border-slate-100/50 pt-2">
                        <span className="text-slate-500 font-semibold">Tertiary Scope:</span>
                        <span className="font-bold text-slate-800">
                          {subjects.find(s => s.subjectId === profileData.subjectId3)?.subName || `Subject #${profileData.subjectId3}`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Dynamic Action Metrics Card */}
          {isExaminer && (
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3 mb-5">
                Examiner Evaluation Statistics
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                    <FileText size={16} />
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider leading-none block mb-0.5">Assigned Papers</span>
                    <p className="text-sm font-bold text-slate-900 leading-none mt-1">
                      {profileData.assignedPapersCount || 0}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 flex items-center gap-3">
                  <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider leading-none block mb-0.5">Scripts Marked</span>
                    <p className="text-sm font-bold text-slate-900 leading-none mt-1">
                      {profileData.completedScriptsCount || 0}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 flex items-center gap-3">
                  <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                    <Clock size={16} />
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider leading-none block mb-0.5">Marking Accuracy</span>
                    <p className="text-sm font-bold text-slate-900 leading-none mt-1">
                      100%
                    </p>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
