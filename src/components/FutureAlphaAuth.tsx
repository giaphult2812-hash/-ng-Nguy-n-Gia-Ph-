import React, { useState, useEffect } from 'react';
import { X, EyeOff, Eye, Mail } from 'lucide-react';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

interface Props {
  onAuthenticated: (profile: any) => void;
}

export const FutureAlphaAuth: React.FC<Props> = ({ onAuthenticated }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isCheckEmail, setIsCheckEmail] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Register state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [referral, setReferral] = useState('');

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleForgotPassword = async () => {
    if (!loginEmail.trim()) {
      setErrorMsg('Vui lòng nhập email để khôi phục mật khẩu!');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, loginEmail.trim());
      setSuccessMsg('Email khôi phục mật khẩu đã được gửi. Vui lòng kiểm tra hộp thư của bạn.');
      setErrorMsg('');
    } catch (error: any) {
      setErrorMsg('Lỗi gửi email khôi phục: ' + error.message);
    }
  };

  const handleResendVerification = async () => {
    if (!loginEmail.trim()) {
      setErrorMsg('Vui lòng nhập email để gửi lại xác nhận!');
      return;
    }
    try {
      // We can't easily resend without the user object, so we'll just show a message or try to sign in to get the user
      setErrorMsg('Vui lòng đăng nhập để hệ thống gửi lại email xác nhận nếu tài khoản chưa kích hoạt.');
    } catch (error: any) {
      setErrorMsg('Lỗi: ' + error.message);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('verify') === 'true') {
      const verifiedEmail = params.get('email');
      if (verifiedEmail) {
        setLoginEmail(verifiedEmail);
      }
      setIsLogin(true);
      setSuccessMsg('Xác thực email thành công! Vui lòng đăng nhập.');
      // Remove query params to clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    const refCode = params.get('ref');
    if (refCode) {
      setReferral(refCode);
      setIsLogin(false); // Switch to register tab
    }
  }, []);

  const handleRegister = (e: React.MouseEvent) => {
    e.preventDefault(); // Chặn form reload
    setErrorMsg('');
    setSuccessMsg('');
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    
    if (trimmedEmail && trimmedPassword) {
      setIsLoading(true);
      
      createUserWithEmailAndPassword(auth, trimmedEmail, trimmedPassword)
        .then((userCredential) => {
          const user = userCredential.user;
          
          const newProfile = {
            uid: user.uid,
            email: trimmedEmail,
            nickname: nickname || trimmedEmail.split('@')[0],
            firstName: '',
            lastName: '',
            avatarUrl: null,
            referral: referral,
            role: trimmedEmail === 'giaphult2812@gmail.com' ? 'admin' : 'user',
            realBalance: trimmedEmail === 'giaphult2812@gmail.com' ? 100000 : 0,
            usdtBalance: 0,
            demoBalance: 10000,
            createdAt: new Date().toISOString()
          };

          // Lưu user vào firestore
          return setDoc(doc(db, 'users', user.uid), newProfile);
        })
        .then(() => {
          setIsLoading(false);
          setIsLogin(true);
          // Hiện thông báo alert
          alert('Đăng ký thành công! Bạn có thể đăng nhập ngay bây giờ.');
          setSuccessMsg(`Đăng ký thành công! Vui lòng đăng nhập bằng tài khoản vừa tạo.`);
        })
        .catch((error: any) => {
          console.log('Lỗi Firebase:', error);
          setIsLoading(false);
          if (error.code === 'auth/email-already-in-use') {
            setErrorMsg('Email này đã được đăng ký!');
          } else if (error.code === 'auth/weak-password') {
            setErrorMsg('Mật khẩu quá yếu. Vui lòng chọn mật khẩu có ít nhất 6 ký tự.');
          } else if (error.code === 'auth/invalid-email') {
            setErrorMsg('Địa chỉ email không hợp lệ!');
          } else if (error.code === 'auth/unauthorized-domain') {
            setErrorMsg('Tên miền chưa được cấp phép trong Firebase Auth. Vui lòng thêm tên miền này vào danh sách Authorized domains trong Firebase Console.');
          } else if (error.code === 'auth/operation-not-allowed') {
            setErrorMsg('Lỗi: Phương thức đăng nhập bằng Email/Mật khẩu chưa được bật. Vui lòng vào Firebase Console -> Authentication -> Sign-in method để bật "Email/Password".');
          } else {
            setErrorMsg('Lỗi đăng ký: ' + error.message);
          }
        });
    } else {
      setErrorMsg("Vui lòng nhập email và mật khẩu!");
    }
  };

  const handleLogin = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    const trimmedEmail = loginEmail.trim();
    const trimmedPassword = loginPassword.trim();
    if (trimmedEmail && trimmedPassword) {
      setIsLoading(true);
      
      // Always allow demo account
      if (trimmedEmail === 'demo@futurealpha.net' && trimmedPassword === '123456') {
        const demoProfile = { 
          uid: 'demo-user-id',
          email: trimmedEmail, 
          nickname: 'Demo User', 
          role: 'user',
          realBalance: 0,
          usdtBalance: 0,
          demoBalance: 10000,
          referral: '', 
          firstName: '', 
          lastName: '', 
          avatarUrl: null 
        };
        localStorage.setItem('futureAlpha_userProfile', JSON.stringify(demoProfile));
        setIsLoading(false);
        onAuthenticated(demoProfile);
        return;
      }

      try {
        const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
        const user = userCredential.user;
        
        if (!user.emailVerified && user.email !== 'demo@futurealpha.net') {
          // In a real production app, we would block login here.
          // For testing/demo purposes, we will allow login but show a warning.
          console.warn('Tài khoản chưa được kích hoạt, nhưng cho phép đăng nhập để test.');
        }
        
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          // Force admin to have 100000 real balance if it's 0 (one-time fix)
          if (userData.role === 'admin' && userData.realBalance === 0) {
            userData.realBalance = 100000;
            await updateDoc(doc(db, 'users', user.uid), { realBalance: 100000 });
            localStorage.setItem(`futureAlpha_realBalance_${user.uid}`, '100000');
          }

          localStorage.setItem('futureAlpha_userProfile', JSON.stringify(userData));
          onAuthenticated(userData);
        } else {
          // Fallback if document doesn't exist but auth succeeded
          const fallbackProfile = {
            uid: user.uid,
            email: user.email,
            nickname: user.email?.split('@')[0] || 'User',
            role: user.email === 'giaphult2812@gmail.com' ? 'admin' : 'user',
            realBalance: user.email === 'giaphult2812@gmail.com' ? 100000 : 0,
            usdtBalance: 0,
            demoBalance: 10000,
            createdAt: new Date().toISOString()
          };
          await setDoc(doc(db, 'users', user.uid), fallbackProfile);
          localStorage.setItem('futureAlpha_userProfile', JSON.stringify(fallbackProfile));
          onAuthenticated(fallbackProfile);
        }
      } catch (error: any) {
        console.error("Login error:", error);
        setIsLoading(false);
        if (error.code === 'auth/unauthorized-domain') {
          setErrorMsg('Tên miền chưa được cấp phép trong Firebase Auth. Vui lòng thêm tên miền này vào danh sách Authorized domains trong Firebase Console.');
        } else if (error.code === 'auth/operation-not-allowed') {
          setErrorMsg('Lỗi: Phương thức đăng nhập bằng Email/Mật khẩu chưa được bật. Vui lòng vào Firebase Console -> Authentication -> Sign-in method để bật "Email/Password".');
        } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
          setErrorMsg('Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại!');
        } else {
          setErrorMsg('Lỗi đăng nhập: ' + error.message);
        }
      }
    } else {
      setErrorMsg('Vui lòng nhập email và mật khẩu!');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#0F0518] flex flex-col font-sans text-white overflow-y-auto">
      <div className="w-full max-w-md mx-auto p-5 sm:p-6 flex flex-col min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between mb-10 relative pt-2">
          <div className="flex items-center gap-2">
            {/* Custom Logo SVG */}
            <div className="w-8 h-8 relative shrink-0 filter drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]">
              <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="logoBodyAuth" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#D8B4FE" />
                    <stop offset="50%" stopColor="#9333EA" />
                    <stop offset="100%" stopColor="#581C87" />
                  </linearGradient>
                </defs>
                <path d="M10 55 C 10 25, 90 25, 90 55" stroke="url(#logoBodyAuth)" strokeWidth="4" fill="none" strokeLinecap="round" transform="rotate(-20 50 50)" opacity="0.8" />
                <path d="M28 20 H 72 L 62 35 H 42 V 45 H 58 L 50 58 H 42 V 80 L 28 80 V 20 Z" fill="url(#logoBodyAuth)" stroke="#E9D5FF" strokeWidth="0.5" />
                <path d="M 52 80 L 65 45 L 82 80 H 68 L 66 72 H 58 L 55 80 H 52 Z M 62 62 L 65 52 L 68 62 H 62 Z" fill="url(#logoBodyAuth)" stroke="#E9D5FF" strokeWidth="0.5" />
                <path d="M90 55 C 90 85, 10 85, 10 55" stroke="url(#logoBodyAuth)" strokeWidth="4" fill="none" strokeLinecap="round" transform="rotate(-20 50 50)" opacity="0.9" strokeDasharray="100" strokeDashoffset="0" />
              </svg>
            </div>
            <span className="text-purple-500 font-bold text-xl tracking-wide">FutureAlpha</span>
          </div>
          <div className="flex justify-end">
            <button 
              onClick={() => setErrorMsg('Vui lòng đăng nhập hoặc đăng ký để tiếp tục.')}
              className="w-10 h-10 bg-[#1E2329] rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#2A2F36] transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {isCheckEmail ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-24 h-24 bg-purple-500/10 rounded-full flex items-center justify-center mb-4">
              <Mail className="w-12 h-12 text-purple-500" />
            </div>
            <h1 className="text-2xl font-bold text-white">Nhập mã OTP</h1>
            <p className="text-gray-400 max-w-[280px]">
              Vui lòng nhập mã OTP (123456) để xác thực tài khoản.
            </p>
            {errorMsg && <div className="text-red-500 text-sm bg-red-500/10 p-3 rounded-lg w-full">{errorMsg}</div>}
            {successMsg && <div className="text-purple-400 text-sm bg-purple-500/10 p-3 rounded-lg w-full border border-purple-500/20">{successMsg}</div>}
            <input 
              type="text" 
              placeholder="Nhập mã OTP..."
              className="w-full bg-[#130720] border border-purple-500/20 rounded-lg py-3.5 px-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500 transition-colors text-center text-xl tracking-widest"
              onChange={(e) => {
                if (e.target.value === '123456') {
                  setIsCheckEmail(false);
                  setIsLogin(true);
                  setLoginEmail(email.trim());
                  setSuccessMsg('Xác thực thành công! Vui lòng đăng nhập.');
                }
              }}
            />
            <button 
              onClick={() => {
                setIsCheckEmail(false);
                setIsLogin(true);
              }}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg py-4 mt-8 transition-colors text-lg shadow-[0_0_15px_rgba(147,51,234,0.3)]"
            >
              Quay lại Đăng nhập
            </button>
          </div>
        ) : isLogin ? (
          <>
            <h1 className="text-purple-500 font-bold text-3xl mb-10 leading-tight">
              Đăng nhập vào Tài khoản của bạn
            </h1>

            {errorMsg && <div className="text-red-500 text-sm bg-red-500/10 p-3 rounded-lg mb-6">{errorMsg}</div>}
            {successMsg && <div className="text-purple-400 text-sm bg-purple-500/10 p-3 rounded-lg mb-6 border border-purple-500/20">{successMsg}</div>}

            {/* Login Form */}
            <div className="space-y-6 flex-1">
              {/* Email */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-400">Địa chỉ Email *</label>
                <input 
                  type="email" 
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="Điền Email..."
                  className="w-full bg-[#130720] border border-purple-500/20 rounded-lg py-3.5 px-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-400">Mật khẩu *</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Điền mật khẩu..."
                    className="w-full bg-[#130720] border border-purple-500/20 rounded-lg py-3.5 px-4 pr-12 text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                  <button 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-400"
                  >
                    {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </button>
                </div>
                <div className="text-right mt-2">
                  <button 
                    onClick={handleForgotPassword}
                    className="text-purple-400 hover:text-purple-300 text-sm transition-colors"
                  >
                    Quên mật khẩu?
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button 
                onClick={handleLogin}
                disabled={isLoading}
                className={`w-full bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg py-4 mt-6 transition-colors text-lg shadow-[0_0_15px_rgba(147,51,234,0.3)] ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </button>
            </div>

            {/* Footer */}
            <div className="mt-12 pb-6 flex flex-col gap-3 text-sm">
              <div>
                <span className="text-gray-300">Cần tài khoản FutureAlpha? </span>
                <button 
                  onClick={() => setIsLogin(false)}
                  className="text-purple-400 hover:text-purple-300 transition-colors"
                >
                  Đăng ký
                </button>
              </div>
              <div>
                <span className="text-gray-300">Không nhận được email xác nhận? </span>
                <button 
                  onClick={handleResendVerification}
                  className="text-purple-400 hover:text-purple-300 transition-colors"
                >
                  Yêu cầu một email mới.
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-purple-500 font-bold text-xl text-center mb-8">
              Tạo tài khoản FutureAlpha
            </h1>

            {errorMsg && <div className="text-red-500 text-sm bg-red-500/10 p-3 rounded-lg mb-6">{errorMsg}</div>}
            {successMsg && <div className="text-purple-400 text-sm bg-purple-500/10 p-3 rounded-lg mb-6 border border-purple-500/20">{successMsg}</div>}

            {/* Register Form */}
            <div className="space-y-5 flex-1">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-300">Địa chỉ Email *</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Điền Email..."
                  className="w-full bg-[#130720] border border-purple-500/20 rounded-lg py-3.5 px-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-300">Mật khẩu *</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Điền mật khẩu..."
                    className="w-full bg-[#130720] border border-purple-500/20 rounded-lg py-3.5 px-4 pr-12 text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                  <button 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-400"
                  >
                    {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </button>
                </div>
                <div className="text-right text-xs text-gray-500 mt-1">{password.length} / 20</div>
              </div>

              {/* Nickname */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-300">Biệt danh *</label>
                <input 
                  type="text" 
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Điền Nickname..."
                  className="w-full bg-[#130720] border border-purple-500/20 rounded-lg py-3.5 px-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
                />
                <div className="text-right text-xs text-gray-500 mt-1">{nickname.length} / 20</div>
              </div>

              {/* Referral */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-300">Mã giới thiệu / Mã khuyến mãi</label>
                <input 
                  type="text" 
                  value={referral}
                  onChange={(e) => setReferral(e.target.value)}
                  placeholder="Điền Mã giới thiệu..."
                  className="w-full bg-[#130720] border border-purple-500/20 rounded-lg py-3.5 px-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              {/* Submit Button */}
              <button 
                onClick={handleRegister}
                disabled={isLoading}
                className={`w-full bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg py-4 mt-8 transition-colors text-lg shadow-[0_0_15px_rgba(147,51,234,0.3)] ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isLoading ? 'Đang gửi email...' : 'Đăng ký'}
              </button>
            </div>

            {/* Footer */}
            <div className="mt-8 pb-6 text-center text-sm">
              <span className="text-gray-500">Có tài khoản FutureAlpha? </span>
              <button 
                onClick={() => setIsLogin(true)}
                className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
              >
                Đăng nhập vào Tài khoản của bạn
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
