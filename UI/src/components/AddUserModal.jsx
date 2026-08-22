import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Mail, 
  Lock, 
  Phone, 
  Building2, 
  BookOpen, 
  Award,
  UploadCloud,
  CheckCircle2,
  XCircle,
  ShieldCheck
} from 'lucide-react';
import authService from '../services/authService';
import departmentService from '../services/departmentService';
import subjectService from '../services/subjectService';
import roleService from '../services/roleService';
import { useAuth } from '../context/AuthContext';

export default function AddUserModal({ isOpen, onClose, onSuccess, activeUniversityId }) {
  const { userType } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    userType: 'examiner',
    departmentId: '',
    subjectId1: '',
    experience: '',
    phone: '',
    address: '',
    profileImage: ''
  });

  // Load departments, subjects, and roles when modal opens
  useEffect(() => {
    if (isOpen && activeUniversityId) {
      setError('');
      // Reset form states
      setFormData({
        name: '',
        email: '',
        password: '',
        userType: 'examiner',
        departmentId: '',
        subjectId1: '',
        experience: '',
        phone: '',
        address: '',
        profileImage: ''
      });

      // Load static university data
      const loadConfig = async () => {
        try {
          const depts = await departmentService.getDepartmentsByUniversity(activeUniversityId, { pageSize: 0 });
          setDepartments(depts?.items || depts || []);

          const subs = await subjectService.getSubjectByUniversity(activeUniversityId, { pageSize: 0 });
          setSubjects(subs?.items || subs || []);

          const res = await roleService.getAllRoles();
          setRoles(res.data || []);
        } catch (err) {
          console.error('Failed to load university context for add user modal:', err);
        }
      };
      loadConfig();
    }
  }, [isOpen, activeUniversityId]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Image file must be under 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, profileImage: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim()) {
      setError('Name, Email, and Password are required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address.');
      return;
    }

    const phoneRegex = /^[0-9]{10}$/;
    if (formData.phone && !phoneRegex.test(formData.phone)) {
      setError('Phone number must contain exactly 10 numeric digits.');
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      setError('Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.');
      return;
    }

    if (!formData.profileImage) {
      setError('Please upload a profile photo for the user.');
      return;
    }

    if (formData.userType === 'examiner' && !formData.subjectId1) {
      setError('Primary subject expertise is required for Examiners.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        userType: formData.userType,
        universityId: parseInt(activeUniversityId, 10),
        fname: formData.name.trim(),
        empId: null,
        aadharNo: '',
        panNo: '',
        collegeId: null,
        subjectId1: formData.subjectId1 ? parseInt(formData.subjectId1, 10) : null,
        subjectId2: null,
        subjectId3: null,
        experience: formData.experience,
        phone: formData.phone,
        address: formData.address,
        profileImage: formData.profileImage,
        isApproved: true // Auto-approved when created directly by Admin or Coordinator
      };

      await authService.register(payload);
      onSuccess('User account registered successfully and activated!');
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to register the user. Email might be already in use.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60  flex items-center justify-center p-4 select-none">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-slate-100 shadow-2xl flex flex-col animate-scale-up">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <div className="flex items-center gap-1.5 text-blue-650 font-extrabold text-[10px] uppercase tracking-widest leading-none mb-1">
              <ShieldCheck size={12} />
              <span>Direct Account Provisioning</span>
            </div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight leading-none">Add New User</h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 rounded-xl transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-3 bg-rose-50 border border-rose-100 text-rose-700 px-4 py-3 rounded-xl text-xs font-semibold shadow-sm">
              <XCircle size={16} className="shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Identity Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">Full Name *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Dr. Jane Smith"
                  className="w-full bg-slate-50/50 border border-slate-200 text-slate-900 pl-10 pr-4 py-2 rounded-xl text-xs focus:outline-none focus:border-blue-600 font-medium transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">Email Address *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="jane.smith@university.edu"
                  className="w-full bg-slate-50/50 border border-slate-200 text-slate-900 pl-10 pr-4 py-2 rounded-xl text-xs focus:outline-none focus:border-blue-600 font-medium transition"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">Password *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="At least 8 chars + uppercase + symbol"
                  className="w-full bg-slate-50/50 border border-slate-200 text-slate-900 pl-10 pr-4 py-2 rounded-xl text-xs focus:outline-none focus:border-blue-600 font-medium transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">Mobile Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="10-digit mobile number"
                  className="w-full bg-slate-50/50 border border-slate-200 text-slate-900 pl-10 pr-4 py-2 rounded-xl text-xs focus:outline-none focus:border-blue-600 font-medium transition"
                />
              </div>
            </div>
          </div>

          {/* Department & Role Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">System Role *</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select
                  value={formData.userType}
                  onChange={(e) => setFormData({ ...formData, userType: e.target.value, subjectId1: '' })}
                  className="w-full bg-slate-50/50 border border-slate-200 text-slate-900 pl-10 pr-4 py-2 rounded-xl text-xs focus:outline-none focus:border-blue-600 font-medium transition cursor-pointer appearance-none"
                >
                  {roles.filter(r => r.isActive).map((role) => {
                    if (role.roleName.toLowerCase() === 'admin' && userType !== 'admin') {
                      return null;
                    }
                    return (
                      <option key={role.roleId} value={role.roleName.toLowerCase()}>
                        {role.roleName}
                      </option>
                    );
                  })}
                  {roles.length === 0 && (
                    <>
                      <option value="examiner">Examiner</option>
                      <option value="coordinator">University Coordinator</option>
                      {userType === 'admin' && <option value="admin">System Administrator</option>}
                    </>
                  )}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">Department Mapped</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select
                  value={formData.departmentId}
                  onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                  className="w-full bg-slate-50/50 border border-slate-200 text-slate-900 pl-10 pr-4 py-2 rounded-xl text-xs focus:outline-none focus:border-blue-600 font-medium transition cursor-pointer appearance-none"
                >
                  <option value="">Select Department (Optional)</option>
                  {departments.map((dept) => (
                    <option key={dept.departmentId} value={dept.departmentId}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Examiner Specifics */}
          {formData.userType === 'examiner' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
              <div>
                <label className="block text-[10px] font-black uppercase text-blue-600 tracking-wider mb-1.5">Primary Subject Area *</label>
                <div className="relative">
                  <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <select
                    value={formData.subjectId1}
                    onChange={(e) => setFormData({ ...formData, subjectId1: e.target.value })}
                    className="w-full bg-white border border-slate-200 text-slate-900 pl-10 pr-4 py-2 rounded-xl text-xs focus:outline-none focus:border-blue-600 font-medium transition cursor-pointer appearance-none"
                  >
                    <option value="">Select Subject</option>
                    {subjects.map((sub) => (
                      <option key={sub.subjectId} value={sub.subjectId}>
                        {sub.subName} ({sub.subCode})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-blue-600 tracking-wider mb-1.5">Evaluation Experience</label>
                <div className="relative">
                  <Award className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    placeholder="e.g. 5 Years in University Grading"
                    className="w-full bg-white border border-slate-200 text-slate-900 pl-10 pr-4 py-2 rounded-xl text-xs focus:outline-none focus:border-blue-600 font-medium transition"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Image Upload Area */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">Profile Picture *</label>
            <div className="flex items-center gap-4">
              {formData.profileImage ? (
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden border border-slate-200 shrink-0">
                  <img src={formData.profileImage} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, profileImage: '' })}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600 transition"
                  >
                    <X size={10} />
                  </button>
                </div>
              ) : (
                <label className="w-20 h-20 bg-slate-50 border border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-100/70 hover:border-slate-400 transition shrink-0">
                  <UploadCloud size={20} />
                  <span className="text-[8px] font-bold mt-1">Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}

              <div className="text-slate-400 text-[10px] leading-relaxed">
                <p className="font-extrabold text-slate-600">Select official onboarding face picture</p>
                <p>Format supported: JPG, PNG. Recommended square proportions. Max size 2MB.</p>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-xs cursor-pointer transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2 bg-gradient-to-r from-blue-600 to-blue-650 hover:from-blue-700 hover:to-blue-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow transition disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Register User'}
          </button>
        </div>
      </div>
    </div>
  );
}
