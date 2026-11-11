import React, { useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signInWithPopup,
} from 'firebase/auth';
import {
  Mail,
  Lock,
  X,
  LogIn,
  UserPlus,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { auth, googleProvider } from '../firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (email: string) => void;
}

type AuthMode = 'login' | 'register' | 'forgot';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showConfigHelp, setShowConfigHelp] = useState(false);

  if (!isOpen) return null;

  const resetFormState = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setPassword('');
    setConfirmPassword('');
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    resetFormState();
  };

  const getFriendlyErrorMessage = (error: unknown): string => {
    const errCode = (error as { code?: string })?.code || '';
    const rawMsg = error instanceof Error ? error.message : String(error);

    if (errCode === 'auth/operation-not-allowed') {
      setShowConfigHelp(true);
      return 'บริการเข้าสู่ระบบด้วย Email/Password ยังไม่ได้เปิดใช้งานใน Firebase Console กรุณาเปิดใช้งานก่อน (ดูวิธีตั้งค่าด้านล่าง)';
    }
    if (errCode === 'auth/user-not-found') {
      return 'ไม่พบบัญชีผู้ใช้นี้ในระบบ กรุณาตรวจสอบอีเมลหรือสมัครสมาชิกใหม่';
    }
    if (errCode === 'auth/wrong-password' || errCode === 'auth/invalid-credential') {
      return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง';
    }
    if (errCode === 'auth/email-already-in-use') {
      return 'อีเมลนี้ถูกลงทะเบียนใช้งานแล้ว กรุณาเข้าสู่ระบบ หรือใช้เมนูลืมรหัสผ่าน';
    }
    if (errCode === 'auth/weak-password') {
      return 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษรขึ้นไป';
    }
    if (errCode === 'auth/invalid-email') {
      return 'รูปแบบที่อยู่อีเมลไม่ถูกต้อง';
    }
    if (errCode === 'auth/too-many-requests') {
      return 'มีการพยายามเข้าสู่ระบบผิดหลายครั้งเกินไป ระบบระงับชั่วคราวเพื่อความปลอดภัย กรุณารอสักครู่แล้วลองใหม่';
    }
    if (errCode === 'auth/popup-closed-by-user') {
      return 'หน้าต่างเข้าสู่ระบบถูกปิดก่อนทำรายการเสร็จ';
    }
    return rawMsg || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง';
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setShowConfigHelp(false);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMsg('กรุณากรอกที่อยู่อีเมล');
      return;
    }

    if (mode === 'forgot') {
      setLoading(true);
      try {
        await sendPasswordResetEmail(auth, cleanEmail);
        setSuccessMsg(
          `ระบบได้ส่งลิงก์สำหรับรีเซ็ตรหัสผ่านไปยัง ${cleanEmail} แล้ว กรุณาตรวจสอบกล่องข้อความหรือโฟลเดอร์อีเมลขยะ`
        );
      } catch (err) {
        setErrorMsg(getFriendlyErrorMessage(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!password) {
      setErrorMsg('กรุณากรอกรหัสผ่าน');
      return;
    }

    if (mode === 'register') {
      if (password.length < 6) {
        setErrorMsg('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
        onSuccess(cred.user.email || cleanEmail);
        onClose();
      } else if (mode === 'register') {
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        // Send email verification link
        try {
          await sendEmailVerification(cred.user);
        } catch {
          // Non-blocking if verification send fails
        }
        onSuccess(cred.user.email || cleanEmail);
        onClose();
      }
    } catch (err) {
      setErrorMsg(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      onSuccess(cred.user.email || 'Google User');
      onClose();
    } catch (err) {
      setErrorMsg(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {mode === 'login' && 'เข้าสู่ระบบเพื่อซิงค์ข้อมูลบนคลาวด์'}
              {mode === 'register' && 'สมัครสมาชิกใหม่ (บันทึกข้อมูลบนคลาวด์)'}
              {mode === 'forgot' && 'รีเซ็ตรหัสผ่าน'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              เชื่อมต่อ Cloud Firestore เพื่อจัดเก็บและจดจำข้อมูลเอกสารของคุณ
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-100 mx-6 mt-5 rounded-lg text-xs font-semibold">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`py-2 rounded-md transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            เข้าสู่ระบบ (Log In)
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className={`py-2 rounded-md transition-all cursor-pointer ${
              mode === 'register'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            สมัครสมาชิกใหม่ (Register)
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 pt-4 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{successMsg}</div>
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-3.5">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                อีเมล (Email) *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            {/* Password Field (Not needed for forgot password) */}
            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    รหัสผ่าน (Password) *
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-[11px] text-blue-700 hover:text-blue-900 hover:underline cursor-pointer"
                    >
                      ลืมรหัสผ่าน?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="อย่างน้อย 6 ตัวอักษร"
                    className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Confirm Password Field (Register mode only) */}
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ยืนยันรหัสผ่านอีกครั้ง (Confirm Password) *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="กรอกรหัสผ่านซ้ำอีกครั้ง"
                    className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <span>กำลังดำเนินการ...</span>
              ) : mode === 'login' ? (
                <>
                  <LogIn className="w-3.5 h-3.5" />
                  <span>เข้าสู่ระบบด้วย Email</span>
                </>
              ) : mode === 'register' ? (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>สร้างบัญชีใหม่ด้วย Email</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>ส่งลิงก์รีเซ็ตรหัสผ่าน</span>
                </>
              )}
            </button>
          </form>

          {mode === 'forgot' && (
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-xs text-blue-700 hover:text-blue-900 hover:underline cursor-pointer"
              >
                กลับไปหน้าเข้าสู่ระบบ
              </button>
            </div>
          )}

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase tracking-wider text-slate-400">
              <span className="bg-white px-2">หรือ</span>
            </div>
          </div>

          {/* Google Sign-in Alternative */}
          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleSignIn}
            className="w-full inline-flex items-center justify-center gap-2.5 py-2.5 px-4 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-60 cursor-pointer shadow-2xs"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>เข้าสู่ระบบด้วย Google</span>
          </button>

          {/* Firebase Console Configuration Instructions (if needed) */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowConfigHelp(!showConfigHelp)}
              className="text-[11px] text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>วิธีเปิดใช้งาน Email/Password ใน Firebase Console</span>
            </button>

            {showConfigHelp && (
              <div className="mt-2 p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-[11px] text-slate-700 space-y-1.5 leading-relaxed">
                <div className="font-semibold text-blue-900 flex items-center justify-between">
                  <span>ขั้นตอนการเปิดใช้งานใน Firebase Console:</span>
                  <a
                    href="https://console.firebase.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 text-blue-700 hover:underline"
                  >
                    <span>Firebase Console</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-600">
                  <li>เปิด <strong>Firebase Console</strong> เลือกโปรเจกต์ของคุณ</li>
                  <li>คลิกเมนู <strong>Authentication</strong> จากแถบซ้าย</li>
                  <li>ไปที่แท็บ <strong>Sign-in method</strong></li>
                  <li>คลิกเลือก <strong>Email/Password</strong></li>
                  <li>เปิดสวิตช์ <strong>Enable</strong> แล้วกด <strong>Save</strong></li>
                </ol>
                <div className="text-[10px] text-slate-500 pt-1">
                  * เมื่อเปิดใช้งานแล้ว สามารถเข้าสู่ระบบด้วย Email และรหัสผ่านเพื่อจดจำข้อมูลบนคลาวด์ได้ทันที
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
