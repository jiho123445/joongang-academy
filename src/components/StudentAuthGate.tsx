import React, { useState, useEffect } from 'react';
import { Lock, UserPlus, LogIn, Clock, XCircle, LogOut, User as UserIcon } from 'lucide-react';
import type { User } from 'firebase/auth';
import { StudentProfile } from '../types';
import {
  signUpStudent,
  loginStudent,
  logoutStudent,
  onStudentAuthStateChanged,
  subscribeStudentProfile,
} from '../lib/studentAuth';

interface StudentAuthGateProps {
  children: React.ReactNode;
}

/**
 * StudentAuthGate - 자료실 페이지를 감싸서, 로그인/가입/승인 상태에 따라
 * 다른 화면을 보여줍니다.
 *
 * - 비로그인: 로그인/회원가입 폼
 * - 로그인했지만 students 문서가 없는 경우(관리자 계정 등): 그대로 통과
 * - 로그인했고 수강생인데 승인대기: "승인 대기 중" 안내
 * - 로그인했고 수강생인데 거절됨: 안내 + 문의 유도
 * - 로그인했고 수강생 승인됨: 자료실(children) 표시
 */
export const StudentAuthGate: React.FC<StudentAuthGateProps> = ({ children }) => {
  const [authUser, setAuthUser] = useState<User | null | undefined>(undefined); // undefined = 확인 중
  const [profile, setProfile] = useState<StudentProfile | null | undefined>(undefined);
  const [profileLoadError, setProfileLoadError] = useState(false);

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [signupDone, setSignupDone] = useState(false);

  useEffect(() => {
    const unsub = onStudentAuthStateChanged((user) => {
      setAuthUser(user);
      if (!user) {
        setProfile(null);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authUser) {
      setProfile(null);
      setProfileLoadError(false);
      return;
    }
    setProfileLoadError(false);
    const unsub = subscribeStudentProfile(
      authUser.uid,
      (p) => {
        setProfile(p);
      },
      () => {
        // 프로필 조회 자체가 실패한 경우: "문서 없음(=관리자)"으로 잘못
        // 처리해 통과시키지 않고, 별도의 오류 상태로 남겨둡니다.
        setProfileLoadError(true);
      }
    );
    return () => unsub();
  }, [authUser]);

  // students 컬렉션에 문서가 없는 로그인 계정(예: 관리자 계정)은 자료실을 바로 통과시킵니다.
  const isNonStudentAccount = authUser && profile === null;

  const resetForm = () => {
    setName('');
    setPhone('');
    setEmail('');
    setPassword('');
    setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim() || !password.trim()) {
      setErrorMsg('이메일과 비밀번호를 입력해 주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'signup') {
        if (!name.trim() || !phone.trim()) {
          setErrorMsg('성함과 연락처를 입력해 주세요.');
          setIsSubmitting(false);
          return;
        }
        await signUpStudent({ name, phone, email, password });
        setSignupDone(true);
      } else {
        await loginStudent(email, password);
      }
      resetForm();
    } catch (err: any) {
      setErrorMsg(err?.message || '요청을 처리하지 못했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 인증 상태 확인 중
  if (authUser === undefined) {
    return (
      <div className="max-w-md mx-auto py-16 text-center text-sm text-slate-400">
        확인 중...
      </div>
    );
  }

  // 비로그인 상태: 로그인/가입 폼
  if (!authUser) {
    return (
      <div className="max-w-md mx-auto px-4">
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/80 shadow-xl p-6 sm:p-8">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
              <Lock className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black text-slate-900">수강생 전용 자료실</h3>
            <p className="text-sm text-slate-500 mt-1.5">
              서식·예제·프로그램 자료는 재원생만 열람할 수 있어요.
              <br />
              계정이 없으시면 회원가입 후 원장님 승인을 받아주세요.
            </p>
          </div>

          {signupDone ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                <Clock className="w-6 h-6" />
              </div>
              <p className="text-sm text-slate-700 font-bold">가입 신청이 접수됐어요!</p>
              <p className="text-xs text-slate-500">
                원장님 승인 후 자료실을 이용하실 수 있어요. 학원으로 전화 주시면 빠르게
                확인해 드립니다.
              </p>
              <button
                onClick={() => {
                  setSignupDone(false);
                  setMode('login');
                }}
                className="text-xs font-bold text-blue-600 underline underline-offset-2"
              >
                로그인 화면으로
              </button>
            </div>
          ) : (
            <>
              <div className="flex rounded-xl bg-slate-100 p-1 mb-5">
                <button
                  onClick={() => { setMode('login'); setErrorMsg(''); }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    mode === 'login' ? 'bg-white shadow text-slate-900' : 'text-slate-500'
                  }`}
                >
                  로그인
                </button>
                <button
                  onClick={() => { setMode('signup'); setErrorMsg(''); }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    mode === 'signup' ? 'bg-white shadow text-slate-900' : 'text-slate-500'
                  }`}
                >
                  회원가입
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                {mode === 'signup' && (
                  <>
                    <input
                      type="text"
                      placeholder="성함"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full p-3 rounded-xl border border-slate-200 text-sm"
                    />
                    <input
                      type="tel"
                      placeholder="연락처 (예: 010-1234-5678)"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full p-3 rounded-xl border border-slate-200 text-sm"
                    />
                  </>
                )}
                <input
                  type="email"
                  placeholder="이메일"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm"
                />
                <input
                  type="password"
                  placeholder="비밀번호 (6자 이상)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm"
                />

                {errorMsg && (
                  <p className="text-xs text-red-600 font-bold flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5 shrink-0" />
                    {errorMsg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-black text-sm rounded-xl shadow-md shadow-blue-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {mode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                  <span>{isSubmitting ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}</span>
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    );
  }

  // 프로필 조회 실패: 권한 없이 통과시키지 않고 오류 화면을 보여줍니다.
  // (profile===undefined 체크보다 먼저 검사해야 합니다 - 오류가 나면 profile은
  // 계속 undefined로 남기 때문에, 순서가 바뀌면 이 분기에 영영 도달하지 못합니다.)
  if (profileLoadError) {
    return (
      <div className="max-w-md mx-auto px-4">
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/80 shadow-xl p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            <XCircle className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-black text-slate-900">확인 중 오류가 발생했어요</h3>
          <p className="text-sm text-slate-500">
            계정 정보를 불러오지 못했어요. 잠시 후 새로고침해 주시거나, 계속되면 학원으로
            문의해 주세요.
          </p>
          <button
            onClick={() => logoutStudent()}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700"
          >
            <LogOut className="w-3.5 h-3.5" />
            로그아웃
          </button>
        </div>
      </div>
    );
  }

  // 프로필 확인 중
  if (profile === undefined) {
    return (
      <div className="max-w-md mx-auto py-16 text-center text-sm text-slate-400">
        확인 중...
      </div>
    );
  }

  // 관리자 등 students 문서가 없는 계정: 바로 통과
  if (isNonStudentAccount) {
    return <>{children}</>;
  }

  // 수강생 - 승인대기
  if (profile && profile.status === '승인대기') {
    return (
      <div className="max-w-md mx-auto px-4">
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/80 shadow-xl p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
            <Clock className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-black text-slate-900">승인 대기 중이에요</h3>
          <p className="text-sm text-slate-500">
            {profile.name}님, 회원가입이 접수됐어요. 원장님 승인 후 자료실을 이용하실 수
            있어요. 급하시면 학원으로 전화 주세요.
          </p>
          <button
            onClick={() => logoutStudent()}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700"
          >
            <LogOut className="w-3.5 h-3.5" />
            로그아웃
          </button>
        </div>
      </div>
    );
  }

  // 수강생 - 거절됨
  if (profile && profile.status === '거절됨') {
    return (
      <div className="max-w-md mx-auto px-4">
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/80 shadow-xl p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            <XCircle className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-black text-slate-900">승인되지 않았어요</h3>
          <p className="text-sm text-slate-500">
            계정 확인이 필요해요. 학원으로 문의해 주세요.
          </p>
          <button
            onClick={() => logoutStudent()}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700"
          >
            <LogOut className="w-3.5 h-3.5" />
            로그아웃
          </button>
        </div>
      </div>
    );
  }

  // 승인됨: 자료실 표시 + 상단에 로그아웃 바
  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-end gap-2 mb-2 text-xs text-slate-500">
        <UserIcon className="w-3.5 h-3.5" />
        <span className="font-bold">{profile?.name}님</span>
        <button
          onClick={() => logoutStudent()}
          className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-700 ml-1"
        >
          <LogOut className="w-3.5 h-3.5" />
          로그아웃
        </button>
      </div>
      {children}
    </div>
  );
};
