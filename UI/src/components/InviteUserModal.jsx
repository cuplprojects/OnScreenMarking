import React, { useState, useEffect } from 'react';
import { 
  X, 
  Mail, 
  Building, 
  UserPlus, 
  Loader, 
  Sparkles,
  Check,
  Copy
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import userService from '../services/userService';

export default function InviteUserModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  activeUniversityId, 
  universities, 
  departments, 
  roles 
}) {
  const { userType } = useAuth();
  
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteDeptId, setInviteDeptId] = useState("");
  const [inviteUniId, setInviteUniId] = useState("");
  const [inviteUserType, setInviteUserType] = useState("examiner");
  
  const [inviteLoading, setInviteLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [generatedLink, setGeneratedLink] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [emailStatus, setEmailStatus] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setInviteEmail("");
      setInviteDeptId("");
      setInviteUniId(activeUniversityId || "");
      setError("");
      setGeneratedLink("");
      setEmailStatus(null);
      setCopiedLink(false);
      
      const activeRoles = roles.filter(r => r.isActive);
      const firstEligible = activeRoles.find(role => {
        if (role.roleName.toLowerCase() === 'admin' && userType !== 'admin') return false;
        return true;
      });
      if (firstEligible) {
        setInviteUserType(firstEligible.roleName.toLowerCase());
      } else {
        setInviteUserType("examiner");
      }
    }
  }, [isOpen, activeUniversityId, roles, userType]);

  if (!isOpen) return null;

  const handleSendInvite = async (e) => {
    e.preventDefault();
    
    setGeneratedLink("");
    setEmailStatus(null);
    setError("");

    const finalUniId = activeUniversityId || inviteUniId;
    if (!inviteEmail) {
      setError("Email address is required.");
      return;
    }
    if (!finalUniId) {
      setError("Please select a university.");
      return;
    }

    try {
      setInviteLoading(true);
      const payload = {
        email: inviteEmail.trim(),
        universityId: parseInt(finalUniId, 10),
        departmentId: inviteDeptId ? parseInt(inviteDeptId, 10) : null,
        userType: inviteUserType
      };

      const res = await userService.inviteUser(payload);

      if (res.success) {
        setInviteEmail("");
        setInviteDeptId("");
        
        const activeRoles = roles.filter(r => r.isActive);
        const firstEligible = activeRoles.find(role => {
          if (role.roleName.toLowerCase() === 'admin' && userType !== 'admin') return false;
          return true;
        });
        setInviteUserType(firstEligible ? firstEligible.roleName.toLowerCase() : "examiner");

        const link = res.invitation?.invitationLink || res.invitation?.InvitationLink;
        if (link) setGeneratedLink(link);

        if (res.emailSent === false) {
          setEmailStatus({ sent: false, error: res.emailError || "SMTP Configuration Issue" });
          setError("Invitation generated, but email failed. Please share link manually.");
        } else {
          setEmailStatus({ sent: true, error: null });
          onSuccess("Invitation email sent successfully!");
        }
      }
    } catch (err) {
      setError(err.message || "Failed to send invitation.");
    } finally {
      setInviteLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 select-none">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-hidden border border-gray-100 shadow-2xl flex flex-col animate-scale-up">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h3 className="text-lg font-black text-gray-900 tracking-tight leading-none">Issue Onboarding Invitation</h3>
            <p className="text-xs text-gray-505 mt-1">Generate a pre-authorized onboarding token invitation for examiners or coordinators</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 bg-white hover:bg-gray-100 border border-gray-200 text-gray-500 rounded-md transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 flex items-center gap-3 bg-rose-50 border border-rose-100 text-rose-700 px-4 py-3 rounded-xl text-xs font-semibold shadow-sm">
              <span>{error}</span>
            </div>
          )}
          
          <form onSubmit={handleSendInvite} className="space-y-4 text-xs font-semibold text-gray-700">
            {/* Email Address */}
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1.5">Examiner Email *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="e.g. examiner.smith@board.org"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-teal-600 bg-gray-50/50 text-gray-900 outline-none transition"
                />
              </div>
            </div>

            {/* University Selection (Only shown for Global Admin) */}
            {userType === "admin" && (
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1.5">Assign University *</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <select
                    required
                    value={inviteUniId}
                    onChange={(e) => {
                      setInviteUniId(e.target.value);
                      setInviteDeptId("");
                    }}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-teal-600 bg-gray-50/50 text-gray-900 font-medium outline-none transition cursor-pointer appearance-none"
                  >
                    <option value="">Select University</option>
                    {universities.map((uni) => (
                      <option key={uni.universityId} value={uni.universityId}>
                        {uni.universityName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Department Selection */}
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1.5">Assign Department</label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <select
                  value={inviteDeptId}
                  onChange={(e) => setInviteDeptId(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-teal-600 bg-gray-50/50 text-gray-900 font-medium outline-none transition cursor-pointer appearance-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={!(activeUniversityId || inviteUniId)}
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

            {/* System Role */}
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1.5">System Role *</label>
              <div className="relative">
                <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <select
                  value={inviteUserType}
                  onChange={(e) => setInviteUserType(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-teal-600 bg-gray-50/50 text-gray-900 font-medium outline-none transition cursor-pointer appearance-none"
                >
                  {roles.filter(r => r.isActive).map((role) => {
                    if (role.roleName.toLowerCase() === 'admin' && userType !== 'admin') return null;
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
                      {userType === "admin" && <option value="admin">System Administrator</option>}
                    </>
                  )}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={inviteLoading}
              className="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold py-3 rounded-md transition shadow flex items-center justify-center gap-1.5 text-xs cursor-pointer disabled:opacity-50 mt-6"
            >
              {inviteLoading ? (
                <>
                  <Loader className="animate-spin" size={14} />
                  Dispatching Link...
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  Send Secure Invitation
                </>
              )}
            </button>
          </form>

          {generatedLink && (
            <div className="border-t border-gray-100 pt-4 animate-slide-up text-xs mt-6">
              <div className={`p-4 rounded-xl border flex flex-col gap-2.5 ${emailStatus?.sent
                ? "bg-emerald-50/40 border-emerald-100"
                : "bg-amber-50/40 border-amber-100"
              }`}>
                <div>
                  <h4 className={`font-extrabold ${emailStatus?.sent ? "text-emerald-800" : "text-amber-800"}`}>
                    {emailStatus?.sent ? "✓ Link Dispatched Successfully" : "⚠ Secure Link Ready (Delivery Issue)"}
                  </h4>
                  <p className={`text-[10px] mt-0.5 leading-relaxed ${emailStatus?.sent ? "text-emerald-600" : "text-amber-600"}`}>
                    {emailStatus?.sent
                      ? "Email invite went through successfully! Copy link below as a backup if needed:"
                      : `Email transfer returned an SMTP error (${emailStatus?.error || "credentials"}). Copy and share the token link manually:`
                    }
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedLink}
                    className="flex-1 bg-white border border-gray-205 rounded-lg px-2.5 py-1.5 text-[10px] text-gray-800 font-mono select-all outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedLink);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                    className={`px-3 py-1.5 rounded-lg border flex items-center justify-center gap-1 transition text-[10px] font-bold ${copiedLink
                      ? "bg-emerald-650 border-emerald-650 text-white"
                      : "bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700 cursor-pointer"
                    }`}
                  >
                    {copiedLink ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedLink ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
