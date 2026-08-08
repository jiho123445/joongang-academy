import React, { useState } from 'react';
import { Calculator, CheckCircle2, DollarSign, HelpCircle, ArrowRight } from 'lucide-react';
import { COURSES_DATA } from '../data/coursesData';

interface CalculatorSectionProps {
  onSelectCourseForInquiry: (courseTitle: string) => void;
}

export const CalculatorSection: React.FC<CalculatorSectionProps> = ({ onSelectCourseForInquiry }) => {
  const [selectedCourseId, setSelectedCourseId] = useState<string>(COURSES_DATA[0].id);
  const [userStatus, setUserStatus] = useState<string>('jobseeker'); // jobseeker, type1, worker, student, senior

  const currentCourse = COURSES_DATA.find((c) => c.id === selectedCourseId) || COURSES_DATA[0];

  // Calculate Subsidized Fee
  const calculateResult = () => {
    const originalTuition = currentCourse.tuition;

    if (!currentCourse.nationalSupport) {
      return {
        subsidyPercent: 0,
        subsidyAmount: 0,
        selfPay: originalTuition,
        note: '일반수강 과정 (홍천군민 및 수강생 할인가 적용 가능)',
      };
    }

    let percent = 70; // Default National Support
    if (userStatus === 'type1') {
      percent = 100;
    } else if (userStatus === 'jobseeker') {
      percent = 80;
    } else if (userStatus === 'worker') {
      percent = 70;
    } else if (userStatus === 'student') {
      percent = 75;
    } else if (userStatus === 'senior') {
      percent = 85;
    }

    const subsidyAmount = Math.round((originalTuition * percent) / 100);
    const selfPay = Math.max(0, originalTuition - subsidyAmount);

    return {
      subsidyPercent: percent,
      subsidyAmount,
      selfPay,
      note: percent === 100 ? '국비 100% 전액 지원 (수강료 0원)' : `정부지원 ${percent}% 적용`,
    };
  };

  const result = calculateResult();

  return (
    <section id="calculator" className="py-12 lg:py-20 bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-blue-100/80 backdrop-blur-sm text-blue-700 border border-blue-200/60 font-extrabold text-xs mb-3 shadow-sm">
            <Calculator className="w-3.5 h-3.5" />
            TUITION CALCULATOR
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            수강료 & 국비 지원금 미리보기
          </h2>
          <p className="text-slate-600 text-sm sm:text-base mt-2">
            원하는 수강 과정과 지원 유형을 선택하여 실효 수강료(자부담금)를 계산해 보세요.
          </p>
        </div>

        {/* Calculator Grid in Glass Dark Panel */}
        <div className="glass-panel-dark rounded-3xl p-6 sm:p-10 border border-white/20 shadow-2xl max-w-4xl mx-auto text-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Input Form */}
            <div className="space-y-6">
              
              {/* Select Course */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  1. 관심 수강 강좌 선택
                </label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full p-3.5 rounded-2xl bg-slate-900/90 border border-white/20 text-white font-bold text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-inner"
                >
                  {COURSES_DATA.map((c) => (
                    <option key={c.id} value={c.id}>
                      [{c.category}] {c.title} ({c.tuition.toLocaleString()}원)
                    </option>
                  ))}
                </select>
              </div>

              {/* Select User Status */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  2. 국민내일배움카드 지원 유형
                </label>
                <div className="space-y-2">
                  {[
                    { id: 'type1', label: '국민취업지원제도 1유형 / 저소득층 (100% 무료)' },
                    { id: 'jobseeker', label: '일반 구직자 / 취업준비생 (70%~80% 지원)' },
                    { id: 'worker', label: '재직자 / 근로자카드 (60%~70% 지원)' },
                    { id: 'student', label: '대학생 / 특성화고 졸업예정자' },
                    { id: 'senior', label: '주부 / 시니어 / 일반 수강생' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      onClick={() => setUserStatus(st.id)}
                      className={`w-full p-3.5 rounded-2xl text-xs sm:text-sm font-bold text-left border transition-all flex items-center justify-between ${
                        userStatus === st.id
                          ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/30'
                          : 'bg-slate-900/60 border-white/10 text-slate-300 hover:bg-slate-800/80'
                      }`}
                    >
                      <span>{st.label}</span>
                      {userStatus === st.id && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Result Display Box */}
            <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-6 border border-white/10 flex flex-col justify-between space-y-6 shadow-inner">
              <div>
                <span className="text-xs font-extrabold text-blue-400 uppercase tracking-wider">
                  예상 수강료 산출 결과
                </span>
                <h3 className="text-lg font-bold text-white mt-1">
                  {currentCourse.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1">{result.note}</p>

                <div className="mt-6 space-y-3 pt-4 border-t border-slate-800 text-xs sm:text-sm">
                  <div className="flex justify-between text-slate-400">
                    <span>정가 수강료</span>
                    <span className="line-through">{currentCourse.tuition.toLocaleString()} 원</span>
                  </div>

                  <div className="flex justify-between text-emerald-400 font-bold">
                    <span>정부 지원금 ({result.subsidyPercent}%)</span>
                    <span>- {result.subsidyAmount.toLocaleString()} 원</span>
                  </div>

                  <div className="flex justify-between text-white text-base font-extrabold pt-3 border-t border-slate-800">
                    <span className="text-blue-300">최종 실효 자부담금</span>
                    <span className="text-2xl font-black text-blue-400">
                      {result.selfPay.toLocaleString()} 원
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => onSelectCourseForInquiry(currentCourse.title)}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
                >
                  <span>이 산출액으로 상담 신청하기</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <p className="text-[11px] text-slate-400 text-center">
                  * 실제 자부담금은 카드 소지 유형 및 기수강 여부에 따라 약간 상이할 수 있습니다.
                </p>
              </div>

            </div>

          </div>
        </div>

      </div>
    </section>
  );
};
