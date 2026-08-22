import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Clock, User, Trash2 } from 'lucide-react';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { StudentProfile } from '../types';

function subscribeAllStudents(onUpdate: (students: StudentProfile[]) => void): () => void {
  const q = query(collection(db, 'students'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const students = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          uid: d.id,
          name: data.name || '',
          phone: data.phone || '',
          email: data.email || '',
          status: data.status || '승인대기',
          createdAt: data.createdAtIso || '',
        } as StudentProfile;
      });
      onUpdate(students);
    },
    (err) => console.error('수강생 목록 구독 실패:', err)
  );
}

async function updateStudentStatus(uid: string, status: '승인됨' | '거절됨'): Promise<void> {
  await updateDoc(doc(db, 'students', uid), { status });
}

/**
 * 수강생 등록 정보를 완전히 삭제(리셋)합니다. Firestore의 students/{uid}
 * 문서를 지우므로, 이후 그 계정으로 로그인해도 등록된 정보가 없는 상태로
 * 처리되어 자료실을 이용하려면 다시 회원가입해야 합니다.
 *
 * ⚠️ 참고: 이 작업은 Firestore의 프로필 정보만 삭제합니다. Firebase
 * Authentication의 로그인 계정 자체(이메일/비밀번호)는 브라우저(클라이언트)
 * 권한으로는 다른 사람 계정을 지울 수 없어서 그대로 남아있습니다. 다만
 * 프로필이 없으면 자료실 접근이 막히므로, "정보 리셋" 목적은 달성됩니다.
 * 로그인 계정 자체까지 완전히 삭제하려면 Firebase Admin SDK 기반 서버 기능이
 * 별도로 필요합니다.
 */
async function deleteStudentAccount(uid: string): Promise<void> {
  await deleteDoc(doc(db, 'students', uid));
}

export const StudentApprovalPanel: React.FC = () => {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'전체' | '승인대기' | '승인됨' | '거절됨'>('승인대기');
  const [processingUid, setProcessingUid] = useState<string | null>(null);
  const [confirmDeleteUid, setConfirmDeleteUid] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeAllStudents((data) => {
      setStudents(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = students.filter((s) => filter === '전체' || s.status === filter);
  const pendingCount = students.filter((s) => s.status === '승인대기').length;

  const handleUpdate = async (uid: string, status: '승인됨' | '거절됨') => {
    setProcessingUid(uid);
    try {
      await updateStudentStatus(uid, status);
    } catch (err) {
      console.error('상태 변경 실패:', err);
      alert('처리 중 오류가 발생했습니다.');
    } finally {
      setProcessingUid(null);
    }
  };

  const handleDelete = async (uid: string) => {
    setProcessingUid(uid);
    try {
      await deleteStudentAccount(uid);
    } catch (err) {
      console.error('수강생 정보 삭제 실패:', err);
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setProcessingUid(null);
      setConfirmDeleteUid(null);
    }
  };

  const statusBadge = (status: StudentProfile['status']) => {
    if (status === '승인대기')
      return <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[11px] font-black">승인대기</span>;
    if (status === '승인됨')
      return <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-black">승인됨</span>;
    return <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-800 text-[11px] font-black">거절됨</span>;
  };

  return (
    <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50 space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {(['승인대기', '승인됨', '거절됨', '전체'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              filter === f ? 'bg-teal-600 text-white shadow' : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            {f}
            {f === '승인대기' && pendingCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px]">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">해당하는 수강생이 없습니다.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((s) => (
              <div key={s.uid} className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-slate-100 text-slate-500 shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-900 text-sm">{s.name}</p>
                    {statusBadge(s.status)}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{s.phone} · {s.email}</p>
                </div>

                {confirmDeleteUid === s.uid ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleDelete(s.uid)}
                      disabled={processingUid === s.uid}
                      className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold cursor-pointer"
                    >
                      {processingUid === s.uid ? '삭제 중...' : '삭제 확인'}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteUid(null)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-bold cursor-pointer"
                    >
                      취소
                    </button>
                  </div>
                ) : (
                  <>
                    {s.status !== '승인됨' && (
                      <button
                        onClick={() => handleUpdate(s.uid, '승인됨')}
                        disabled={processingUid === s.uid}
                        className="p-2 rounded-xl text-emerald-600 hover:bg-emerald-50 transition-colors shrink-0"
                        title="승인"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                    )}
                    {s.status !== '거절됨' && (
                      <button
                        onClick={() => handleUpdate(s.uid, '거절됨')}
                        disabled={processingUid === s.uid}
                        className="p-2 rounded-xl text-red-500 hover:bg-red-50 transition-colors shrink-0"
                        title="거절"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={() => setConfirmDeleteUid(s.uid)}
                      disabled={processingUid === s.uid}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                      title="계정 정보 삭제 (리셋)"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
