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
  FileText,
  Edit3,
  KeyRound,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  X,
  Save,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import userService from '../services/userService';
import authService from '../services/authService';
import subjectService from '../services/subjectService';
import { useBreadcrumb } from '../context/BreadcrumbContext';
import { decryptId } from '../utils/encryption';

export default function Profile() {
  const [searchParams] = useSearchParams();
  const rawQueryUserId = searchParams.get('userId');
  const queryUserId = rawQueryUserId ? decryptId(rawQueryUserId) : null;
  const { user: currentUser, userType, updateUser, refreshUser } = useAuth();
  const { setBreadcrumb } = useBreadcrumb();

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'edit' | 'password'

  // Edit Profile Form State
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    address: '',
    profileImage: '',
    fname: '',
    experience: '',
    collegeId: '',
    subjectIds: []
  });
  const [selectedSubjectToAdd, setSelectedSubjectToAdd] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [profileErrorMsg, setProfileErrorMsg] = useState('');

  // Change Password Form State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState('');
  const [passwordErrorMsg, setPasswordErrorMsg] = useState('');

  const isSelf = !queryUserId || (currentUser && currentUser.id === Number(queryUserId));

  useEffect(() => {
    // Set breadcrumbs dynamically
    setBreadcrumb([
      { label: queryUserId ? (profileData?.name ? `${profileData.name}'s Profile` : 'User Profile') : 'My Profile Workspace', path: '/profile', icon: 'User' }
    ]);
  }, [userType, queryUserId, profileData, setBreadcrumb]);

  const loadProfile = async () => {
    setLoading(true);
    setError('');
    try {
      if (queryUserId) {
        const fetchedUser = await userService.getUserById(queryUserId);
        setProfileData(fetchedUser);
        initEditForm(fetchedUser);
      } else {
        const freshUser = await userService.getUserById(currentUser?.id || 0).catch(() => currentUser);
        setProfileData(freshUser || currentUser);
        initEditForm(freshUser || currentUser);
      }
    } catch (err) {
      setError(err.message || 'Failed to load user profile information.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [queryUserId, currentUser?.id]);

  const initEditForm = (user) => {
    if (!user) return;
    // Collect all subject IDs from subjectIds, subjectId1, subjectId2, subjectId3
    const ids = [];
    if (Array.isArray(user.subjectIds) && user.subjectIds.length > 0) {
      ids.push(...user.subjectIds);
    } else {
      if (user.subjectId1) ids.push(user.subjectId1);
      if (user.subjectId2) ids.push(user.subjectId2);
      if (user.subjectId3) ids.push(user.subjectId3);
    }
    const uniqueIds = Array.from(new Set(ids));

    setEditForm({
      name: user.name || '',
      phone: user.phone || '',
      address: user.address || '',
      profileImage: user.profileImage || '',
      fname: user.fname || '',
      experience: user.experience || '',
      collegeId: user.collegeId ? String(user.collegeId) : '',
      subjectIds: uniqueIds
    });
  };

  useEffect(() => {
    const fetchSubjects = async () => {
      const uniId = profileData?.universityId || currentUser?.universityId;
      if (!uniId) return;
      try {
        const data = await subjectService.getSubjectByUniversity(uniId, { pageSize: 0 });
        const list = Array.isArray(data) ? data : (data?.items || []);
        setSubjects(list);
      } catch (err) {
        console.error("Failed to load subjects:", err);
        setSubjects([]);
      }
    };
    if (profileData) {
      fetchSubjects();
    }
  }, [profileData, currentUser]);

  // Handle Add Subject
  const handleAddSubject = () => {
    if (!selectedSubjectToAdd) return;
    const subId = Number(selectedSubjectToAdd);
    if (!editForm.subjectIds.includes(subId)) {
      setEditForm(prev => ({
        ...prev,
        subjectIds: [...prev.subjectIds, subId]
      }));
    }
    setSelectedSubjectToAdd('');
  };

  // Handle Remove Subject
  const handleRemoveSubject = (subIdToRemove) => {
    setEditForm(prev => ({
      ...prev,
      subjectIds: prev.subjectIds.filter(id => id !== subIdToRemove)
    }));
  };

  // Save Profile Changes
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileErrorMsg('');
    setProfileSuccessMsg('');
    setSavingProfile(true);

    try {
      const payload = {
        name: editForm.name.trim(),
        phone: editForm.phone.trim(),
        address: editForm.address.trim(),
        profileImage: editForm.profileImage.trim(),
        fname: editForm.fname.trim(),
        experience: editForm.experience.trim(),
        collegeId: editForm.collegeId ? Number(editForm.collegeId) : null,
        subjectIds: editForm.subjectIds
      };

      if (isSelf) {
        const res = await userService.updateProfile(payload);
        const updated = res?.data || res;
        if (updated) {
          setProfileData(prev => ({ ...prev, ...updated }));
          updateUser(updated);
        }
        await refreshUser();
      } else {
        await userService.updateUser(queryUserId, payload);
        const refreshed = await userService.getUserById(queryUserId);
        setProfileData(refreshed);
      }

      setProfileSuccessMsg('Profile and subjects updated successfully!');
      setTimeout(() => setProfileSuccessMsg(''), 4000);
    } catch (err) {
      setProfileErrorMsg(err.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Change Password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordErrorMsg('');
    setPasswordSuccessMsg('');

    if (!passwordForm.currentPassword) {
      setPasswordErrorMsg('Please enter your current password.');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordErrorMsg('New password must be at least 6 characters long.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordErrorMsg('New passwords do not match.');
      return;
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      setPasswordErrorMsg('New password must be different from your current password.');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await authService.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordSuccessMsg(res?.message || 'Password changed successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPasswordSuccessMsg(''), 4000);
    } catch (err) {
      setPasswordErrorMsg(err.message || 'Failed to change password. Please verify current password.');
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-600 border-t-transparent"></div>
        <p className="text-gray-500 font-bold text-xs uppercase tracking-wider animate-pulse">Loading Profile Workspace...</p>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="min-h-screen bg-gray-50 py-4 flex items-center justify-center md:px-6 px-4">
        <div className="bg-white border border-red-100 rounded-xl shadow-sm max-w-md w-full text-center p-4 md:p-6">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-1">Profile Resolution Error</h3>
          <p className="text-xs text-gray-500 mb-4">{error || 'User not found in system.'}</p>
          <Link to="/" className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all uppercase tracking-wider">
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const isCoordinator = profileData.userType === 'coordinator';
  const isAdmin = profileData.userType === 'admin';
  const isExaminer = profileData.userType === 'examiner' || (!isCoordinator && !isAdmin);

  // Subject helper list
  const userAssignedSubjectIds = Array.isArray(profileData.subjectIds) && profileData.subjectIds.length > 0
    ? profileData.subjectIds
    : [profileData.subjectId1, profileData.subjectId2, profileData.subjectId3].filter(Boolean);

  const availableSubjectsForAdd = subjects.filter(s => !editForm.subjectIds.includes(s.subjectId));

  return (
    <div className="bg-transparent w-full max-w-none px-4 py-3 lg:px-8 lg:py-4">

      {/* HEADER SECTION WITH TABS */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <User className="text-teal-600" size={22} />
            {isSelf ? 'My Profile' : `${profileData.name}'s Profile`}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage your personal credentials, assigned evaluation subjects, and security settings
          </p>
        </div>

        {/* Action Tabs */}
        <div className="flex items-center bg-gray-100/80 p-1 rounded-xl border border-gray-200 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'bg-white text-teal-800 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BookOpen size={14} /> Overview
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab('edit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'edit'
                ? 'bg-white text-teal-800 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Edit3 size={14} /> Edit Profile & Subjects
          </button>

          {isSelf && (
            <button
              type="button"
              onClick={() => setActiveTab('password')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'password'
                  ? 'bg-white text-teal-800 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <KeyRound size={14} /> Change Password
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        
        {/* LEFT COLUMN - USER IDENTITY CARD & BIO */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          
          {/* Main Profile Identity Card */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="h-28 bg-gradient-to-r from-teal-600 to-teal-700 relative">
              <span className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm text-white border border-white/20 text-[9px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                {profileData.userType || 'Examiner'}
              </span>
            </div>
            <div className="px-5 pb-6 text-center relative -mt-12">
              <div className="w-24 h-24 bg-white p-1 rounded-full shadow-lg border border-gray-100 mx-auto overflow-hidden flex items-center justify-center">
                {profileData.profileImage ? (
                  <img src={profileData.profileImage} alt={profileData.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-400">
                    <User size={36} />
                  </div>
                )}
              </div>
              
              <h2 className="text-base font-bold text-gray-900 mt-3 leading-tight">{profileData.name}</h2>
              <p className="text-xs font-medium text-gray-500 mt-1">{profileData.email}</p>
              
              {/* Quick Status */}
              <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-center gap-6">
                <div className="text-center">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none block">Status</span>
                  <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    {profileData.isActive ? 'Active Account' : 'Inactive'}
                  </span>
                </div>
                {userAssignedSubjectIds.length > 0 && (
                  <div className="text-center">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none block">Subjects</span>
                    <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100">
                      {userAssignedSubjectIds.length} Registered
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Details Sidebar Info */}
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Account Metadata</h3>
            
            <div className="flex items-center gap-3 border-b border-gray-50 pb-3">
              <div className="p-2 bg-teal-50 text-teal-700 rounded-xl">
                <Shield size={14} />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider leading-none">Security Role</span>
                <p className="text-xs font-bold text-gray-800 capitalize mt-0.5">{profileData.userType || 'Standard'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 border-b border-gray-50 pb-3">
              <div className="p-2 bg-teal-50 text-teal-700 rounded-xl">
                <Building size={14} />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider leading-none">Affiliation Scope</span>
                <p className="text-xs font-bold text-gray-800 truncate mt-0.5">
                  {profileData.university?.universityName || profileData.universityName || 'System Board'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <MapPin size={14} />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider leading-none">Location Details</span>
                <p className="text-xs font-bold text-gray-800 truncate mt-0.5">{profileData.address || 'Not Provided'}</p>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN - CONTENT TABS */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <>
              {/* Complete Profile Identity Details */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 md:p-6">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-5">
                  <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                    Personal Information & Context
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('edit')}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-800 transition-colors"
                  >
                    <Edit3 size={13} /> Edit Details
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  <div>
                    <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider leading-none block mb-1">Full Legal Name</span>
                    <p className="text-xs font-bold text-gray-800 bg-gray-50/50 p-2.5 rounded-xl border border-gray-100 flex items-center gap-2">
                      <User size={14} className="text-gray-400" />
                      {profileData.name}
                    </p>
                  </div>

                  <div>
                    <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider leading-none block mb-1">Email Communication</span>
                    <p className="text-xs font-bold text-gray-800 bg-gray-50/50 p-2.5 rounded-xl border border-gray-100 flex items-center gap-2">
                      <Mail size={14} className="text-gray-400" />
                      {profileData.email}
                    </p>
                  </div>

                  <div>
                    <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider leading-none block mb-1">Phone Number</span>
                    <p className="text-xs font-bold text-gray-800 bg-gray-50/50 p-2.5 rounded-xl border border-gray-100 flex items-center gap-2">
                      <Phone size={14} className="text-gray-400" />
                      {profileData.phone || 'No registered phone number'}
                    </p>
                  </div>

                  {profileData.fname && (
                    <div>
                      <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider leading-none block mb-1">Father / Legal Name</span>
                      <p className="text-xs font-bold text-gray-800 bg-gray-50/50 p-2.5 rounded-xl border border-gray-100 flex items-center gap-2">
                        <User size={14} className="text-gray-400" />
                        {profileData.fname}
                      </p>
                    </div>
                  )}

                  {profileData.empId && (
                    <div>
                      <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider leading-none block mb-1">Employee ID</span>
                      <p className="text-xs font-bold text-gray-800 bg-gray-50/50 p-2.5 rounded-xl border border-gray-100 flex items-center gap-2 font-mono">
                        <Building size={14} className="text-gray-400" />
                        {profileData.empId}
                      </p>
                    </div>
                  )}

                  {profileData.collegeId && (
                    <div>
                      <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider leading-none block mb-1">College Identification ID</span>
                      <p className="text-xs font-bold text-gray-800 bg-gray-50/50 p-2.5 rounded-xl border border-gray-100 flex items-center gap-2 font-mono">
                        <Building size={14} className="text-gray-400" />
                        {profileData.collegeId}
                      </p>
                    </div>
                  )}

                  {profileData.experience && (
                    <div>
                      <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider leading-none block mb-1">Evaluation Experience</span>
                      <p className="text-xs font-bold text-gray-800 bg-gray-50/50 p-2.5 rounded-xl border border-gray-100 flex items-center gap-2">
                        <Layers size={14} className="text-gray-400" />
                        {profileData.experience}
                      </p>
                    </div>
                  )}

                  {/* Registered Subject Areas */}
                  <div className="col-span-1 md:col-span-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider leading-none block">
                        Registered Evaluation Subjects ({userAssignedSubjectIds.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('edit')}
                        className="text-[11px] font-semibold text-teal-700 hover:underline"
                      >
                        + Add Subjects
                      </button>
                    </div>

                    {userAssignedSubjectIds.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {userAssignedSubjectIds.map((subId, index) => {
                          const subObj = Array.isArray(subjects) ? subjects.find(s => s.subjectId === subId) : null;
                          const label = subObj?.subName || `Subject #${subId}`;
                          const code = subObj?.subCode || '';
                          const isPrimary = index === 0;
                          const isSecondary = index === 1;
                          const isTertiary = index === 2;

                          return (
                            <div 
                              key={subId} 
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium ${
                                isPrimary 
                                  ? 'bg-teal-50 border-teal-200 text-teal-900' 
                                  : isSecondary 
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                                  : 'bg-gray-50 border-gray-200 text-gray-800'
                              }`}
                            >
                              <BookOpen size={13} className="text-teal-600 flex-shrink-0" />
                              <span className="font-semibold">{label}</span>
                              {code && <span className="text-[10px] opacity-75 font-mono">({code})</span>}
                              <span className="text-[9px] uppercase px-1.5 py-0.5 rounded-md font-bold tracking-wider bg-white/70 border border-black/5">
                                {isPrimary ? 'Primary' : isSecondary ? 'Secondary' : isTertiary ? 'Tertiary' : 'Expertise'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="bg-gray-50/70 border border-dashed border-gray-200 rounded-xl p-4 text-center">
                        <BookOpen size={20} className="text-gray-400 mx-auto mb-1" />
                        <p className="text-xs text-gray-500">No subjects registered yet.</p>
                        <button
                          type="button"
                          onClick={() => setActiveTab('edit')}
                          className="mt-2 text-xs font-bold text-teal-700 hover:underline cursor-pointer"
                        >
                          Add evaluation subjects to your profile
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {/* Dynamic Action Metrics Card (If Examiner) */}
              {isExaminer && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 md:p-6">
                  <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider border-b border-gray-100 pb-3 mb-5">
                    Examiner Evaluation Workload
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 flex items-center gap-3">
                      <div className="w-9 h-9 bg-teal-50 text-teal-700 rounded-lg flex items-center justify-center">
                        <FileText size={16} />
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider leading-none block mb-0.5">Assigned Papers</span>
                        <p className="text-sm font-bold text-gray-900 leading-none mt-1">
                          {profileData.assignedPapersCount || 0}
                        </p>
                      </div>
                    </div>

                    <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 flex items-center gap-3">
                      <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                        <CheckCircle2 size={16} />
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider leading-none block mb-0.5">Scripts Marked</span>
                        <p className="text-sm font-bold text-gray-900 leading-none mt-1">
                          {profileData.completedScriptsCount || 0}
                        </p>
                      </div>
                    </div>

                    <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 flex items-center gap-3">
                      <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                        <Clock size={16} />
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider leading-none block mb-0.5">Evaluation Status</span>
                        <p className="text-sm font-bold text-gray-900 leading-none mt-1">
                          Active
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* TAB 2: EDIT PROFILE & SUBJECTS */}
          {activeTab === 'edit' && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 md:p-6">
              <div className="border-b border-gray-100 pb-3 mb-5">
                <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                  Edit Profile & Registered Subjects
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Update your contact information and manage the subjects you are qualified to evaluate.
                </p>
              </div>

              {profileSuccessMsg && (
                <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold p-3 rounded-xl flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  {profileSuccessMsg}
                </div>
              )}

              {profileErrorMsg && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-800 text-xs font-semibold p-3 rounded-xl flex items-center gap-2">
                  <AlertCircle size={16} className="text-red-600" />
                  {profileErrorMsg}
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-6">
                
                {/* Basic Info Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Full Legal Name</label>
                    <input
                      type="text"
                      required
                      value={editForm.name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+91 9876543210"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Father / Legal Name</label>
                    <input
                      type="text"
                      value={editForm.fname}
                      onChange={(e) => setEditForm(prev => ({ ...prev, fname: e.target.value }))}
                      placeholder="Father / Guardian Name"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Teaching / Evaluation Experience</label>
                    <input
                      type="text"
                      value={editForm.experience}
                      onChange={(e) => setEditForm(prev => ({ ...prev, experience: e.target.value }))}
                      placeholder="e.g. 5 Years in Mathematics"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Residential / Campus Address</label>
                    <input
                      type="text"
                      value={editForm.address}
                      onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Campus or Street Address"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Profile Photo Image URL</label>
                    <input
                      type="text"
                      value={editForm.profileImage}
                      onChange={(e) => setEditForm(prev => ({ ...prev, profileImage: e.target.value }))}
                      placeholder="https://... or data:image/png;base64,..."
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                    />
                  </div>
                </div>

                {/* SUBJECTS MANAGEMENT SECTION */}
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                        Add & Manage Subjects ({editForm.subjectIds.length})
                      </h4>
                      <p className="text-[11px] text-gray-500">
                        Select and add the subjects you evaluate. The first three will be configured as primary, secondary, and tertiary specializations.
                      </p>
                    </div>
                  </div>

                  {/* Add Subject Row */}
                  <div className="flex flex-col sm:flex-row items-center gap-2 mt-3 mb-4">
                    <select
                      value={selectedSubjectToAdd}
                      onChange={(e) => setSelectedSubjectToAdd(e.target.value)}
                      className="w-full sm:flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                    >
                      <option value="">-- Choose a subject to add --</option>
                      {availableSubjectsForAdd.map(sub => (
                        <option key={sub.subjectId} value={sub.subjectId}>
                          {sub.subName} {sub.subCode ? `(${sub.subCode})` : ''}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAddSubject}
                      disabled={!selectedSubjectToAdd}
                      className="w-full sm:w-auto px-4 py-2 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus size={14} /> Add Subject
                    </button>
                  </div>

                  {/* Current Selected Subjects Chips */}
                  <div className="bg-gray-50/60 border border-gray-200 rounded-xl p-3 min-h-[70px]">
                    {editForm.subjectIds.length === 0 ? (
                      <p className="text-xs text-gray-400 italic text-center py-2">
                        No subjects added yet. Select a subject from the list above and click &quot;Add Subject&quot;.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {editForm.subjectIds.map((subId, index) => {
                          const subObj = Array.isArray(subjects) ? subjects.find(s => s.subjectId === subId) : null;
                          const label = subObj?.subName || `Subject #${subId}`;
                          const code = subObj?.subCode || '';
                          const isPrimary = index === 0;
                          const isSecondary = index === 1;
                          const isTertiary = index === 2;

                          return (
                            <div 
                              key={subId}
                              className={`flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                                isPrimary 
                                  ? 'bg-teal-50 border-teal-300 text-teal-900 shadow-xs' 
                                  : isSecondary 
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-xs' 
                                  : 'bg-white border-gray-300 text-gray-800 shadow-xs'
                              }`}
                            >
                              <BookOpen size={13} className="text-teal-600" />
                              <span className="font-bold">{label}</span>
                              {code && <span className="text-[10px] opacity-75 font-mono">({code})</span>}
                              
                              <span className="text-[8px] uppercase px-1.5 py-0.5 rounded font-extrabold tracking-wider bg-black/5">
                                {isPrimary ? '1st' : isSecondary ? '2nd' : isTertiary ? '3rd' : `${index + 1}th`}
                              </span>

                              <button
                                type="button"
                                onClick={() => handleRemoveSubject(subId)}
                                className="p-1 hover:bg-red-100 hover:text-red-600 text-gray-400 rounded-lg transition-colors ml-1 focus:outline-none"
                                title="Remove Subject"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('overview')}
                    className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-5 py-2 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                  >
                    {savingProfile ? (
                      <>
                        <RefreshCw className="animate-spin" size={14} />
                        Saving Changes...
                      </>
                    ) : (
                      <>
                        <Save size={14} />
                        Save Profile & Subjects
                      </>
                    )}
                  </button>
                </div>

              </form>
            </div>
          )}

          {/* TAB 3: CHANGE PASSWORD */}
          {activeTab === 'password' && isSelf && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 md:p-6">
              <div className="border-b border-gray-100 pb-3 mb-5">
                <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                  <KeyRound size={16} className="text-teal-600" />
                  Change Account Password
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Ensure your account is using a strong password of at least 6 characters.
                </p>
              </div>

              {passwordSuccessMsg && (
                <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold p-3 rounded-xl flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  {passwordSuccessMsg}
                </div>
              )}

              {passwordErrorMsg && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-800 text-xs font-semibold p-3 rounded-xl flex items-center gap-2">
                  <AlertCircle size={16} className="text-red-600" />
                  {passwordErrorMsg}
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
                
                {/* Current Password */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      required
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                      placeholder="••••••••"
                      className="w-full pl-3 pr-10 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                      placeholder="Minimum 6 characters"
                      className="w-full pl-3 pr-10 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Re-enter new password"
                      className="w-full pl-3 pr-10 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                    <p className="text-[11px] text-red-500 font-medium mt-1">New passwords do not match</p>
                  )}
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {savingPassword ? (
                      <>
                        <RefreshCw className="animate-spin" size={14} />
                        Updating Password...
                      </>
                    ) : (
                      'Update Password'
                    )}
                  </button>
                </div>

              </form>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
