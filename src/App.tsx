import React, { useState, useEffect } from 'react';
import { Course } from './types';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { HomeHub } from './components/HomeHub';
import { PageHeader } from './components/PageHeader';
import { CourseExplorer } from './components/CourseExplorer';
import { CourseDetailModal } from './components/CourseDetailModal';
import { NationalSupportGuide } from './components/NationalSupportGuide';
import { CalculatorSection } from './components/CalculatorSection';
import { AcademyIntro } from './components/AcademyIntro';
import { NoticeBoard } from './components/NoticeBoard';
import { FaqSection } from './components/FaqSection';
import { InquirySection } from './components/InquirySection';
import { LocationSection } from './components/LocationSection';
import { Footer } from './components/Footer';
import { AiConsultantModal } from './components/AiConsultantModal';
import { MobileQuickBar } from './components/MobileQuickBar';
import { ChevronRight, CreditCard, Calculator, FileText, MapPin, Award } from 'lucide-react';

export default function App() {
  const [activeSection, setActiveSection] = useState<string>('home');
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');
  const [selectedCourseForModal, setSelectedCourseForModal] = useState<Course | null>(null);
  const [preselectedCourseForInquiry, setPreselectedCourseForInquiry] = useState<string>('');
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);

  // Sync state with URL hash for true multi-page navigation experience
  useEffect(() => {
    const parseHash = () => {
      const raw = window.location.hash.replace('#', '').trim();
      if (
        raw &&
        ['courses', 'national-support', 'calculator', 'intro', 'notices', 'inquiry', 'location', 'home'].includes(raw)
      ) {
        setActiveSection(raw);
      } else if (raw === 'hero') {
        setActiveSection('home');
      }
    };

    parseHash();
    window.addEventListener('hashchange', parseHash);
    return () => window.removeEventListener('hashchange', parseHash);
  }, []);

  const handleNavigate = (pageId: string) => {
    const targetPage = pageId === 'hero' ? 'home' : pageId;
    setActiveSection(targetPage);
    window.location.hash = targetPage;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectCourseForInquiry = (courseTitle: string) => {
    setPreselectedCourseForInquiry(courseTitle);
    handleNavigate('inquiry');
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-900 font-sans antialiased selection:bg-blue-600 selection:text-white pb-16 lg:pb-0">
      
      {/* Top Header Navigation */}
      <Header
        activeSection={activeSection}
        onNavigate={handleNavigate}
        onOpenAiModal={() => setIsAiModalOpen(true)}
      />

      {/* Main Multi-Page Content Router */}
      <main className="min-h-[70vh]">
        
        {/* 1. HOME PAGE */}
        {(activeSection === 'home' || activeSection === 'hero') && (
          <div className="animate-fadeIn">
            <HeroSection
              onNavigate={handleNavigate}
              onOpenAiModal={() => setIsAiModalOpen(true)}
              onSelectCategory={(cat) => setSelectedCategory(cat)}
            />
            <HomeHub
              onNavigate={handleNavigate}
              onSelectCategory={(cat) => setSelectedCategory(cat)}
              onSelectCourseForInquiry={handleSelectCourseForInquiry}
            />
          </div>
        )}

        {/* 2. COURSES PAGE */}
        {activeSection === 'courses' && (
          <div className="animate-fadeIn">
            <PageHeader
              title="전체 교육과정"
              subtitle="컴퓨터활용능력, 전산세무회계, 시니어/어르신 기초, 파이썬&AI 등 1:1 맞춤형 실습"
              categoryName="교육과정"
              onNavigateHome={() => handleNavigate('home')}
            />
            <CourseExplorer
              selectedCategory={selectedCategory}
              onSelectCategory={(cat) => setSelectedCategory(cat)}
              onOpenDetailModal={(course) => setSelectedCourseForModal(course)}
              onSelectCourseForInquiry={handleSelectCourseForInquiry}
            />
            {/* Page Bottom Navigation Shortcut */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 border border-white/80 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-base">내가 부담할 실수강료가 얼마인지 궁금하신가요?</h4>
                  <p className="text-xs text-slate-600 mt-0.5">국민내일배움카드 지원금 적용시 예상 자부담금을 1초만에 산출해 보세요.</p>
                </div>
                <button
                  onClick={() => handleNavigate('calculator')}
                  className="px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Calculator className="w-4 h-4" />
                  <span>수강료 자부담 계산기 바로가기</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. NATIONAL SUPPORT PAGE */}
        {activeSection === 'national-support' && (
          <div className="animate-fadeIn">
            <PageHeader
              title="국민내일배움카드 국비지원 안내"
              subtitle="고용노동부 지원 혜택, 신청 자격 요건, 발급 절차 및 HRD-Net 가이드"
              categoryName="국비지원"
              onNavigateHome={() => handleNavigate('home')}
            />
            <NationalSupportGuide
              onNavigateToInquiry={() => handleNavigate('inquiry')}
            />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 border border-white/80 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-base">국비 지원 개설 과목 목록 보기</h4>
                  <p className="text-xs text-slate-600 mt-0.5">국민내일배움카드로 수강 가능한 전체 강좌 및 시간표를 확인하세요.</p>
                </div>
                <button
                  onClick={() => handleNavigate('courses')}
                  className="px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md flex items-center gap-1.5 whitespace-nowrap"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>국비지원 교육과정 보기</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4. CALCULATOR PAGE */}
        {activeSection === 'calculator' && (
          <div className="animate-fadeIn">
            <PageHeader
              title="수강료 자부담 계산기"
              subtitle="신분 및 국민내일배움카드 소지 여부에 따른 실수강료 및 지원금 미리보기"
              categoryName="수강료 산출"
              onNavigateHome={() => handleNavigate('home')}
            />
            <CalculatorSection
              onSelectCourseForInquiry={handleSelectCourseForInquiry}
            />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 border border-white/80 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-base">계산된 예상 수강료로 친절 상담을 받아보세요</h4>
                  <p className="text-xs text-slate-600 mt-0.5">온라인으로 간편하게 신청하시면 담당 선생님이 친절히 안내드립니다.</p>
                </div>
                <button
                  onClick={() => handleNavigate('inquiry')}
                  className="px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md flex items-center gap-1.5 whitespace-nowrap"
                >
                  <FileText className="w-4 h-4" />
                  <span>온라인 수강 상담 신청</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 5. INTRO PAGE */}
        {activeSection === 'intro' && (
          <div className="animate-fadeIn">
            <PageHeader
              title="학원 소개 & 원장 인사말"
              subtitle="1969년 설립 이래 50년 넘게 홍천 지역 사회와 함께해온 최고의 컴퓨터 교육기관"
              categoryName="학원소개"
              onNavigateHome={() => handleNavigate('home')}
            />
            <AcademyIntro />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 border border-white/80 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-base">직접 방문하시거나 전화 문의를 환영합니다</h4>
                  <p className="text-xs text-slate-600 mt-0.5">홍천 중앙시장 입구 맞은편, 터미널 도보 5분 거리에 위치하고 있습니다.</p>
                </div>
                <button
                  onClick={() => handleNavigate('location')}
                  className="px-5 py-2.5 rounded-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-extrabold text-xs shadow-md flex items-center gap-1.5 whitespace-nowrap"
                >
                  <MapPin className="w-4 h-4" />
                  <span>오시는 길 약도 보기</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 6. NOTICES & FAQ PAGE */}
        {activeSection === 'notices' && (
          <div className="animate-fadeIn">
            <PageHeader
              title="공지사항 & 자격증 시험일정"
              subtitle="2026년 모집 일정, 검정 시험 일정 안내 및 자주 묻는 질문(FAQ)"
              categoryName="공지 및 FAQ"
              onNavigateHome={() => handleNavigate('home')}
            />
            <NoticeBoard />
            <div className="pt-8">
              <FaqSection />
            </div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 border border-white/80 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-base">궁금한 점이 해결되지 않으셨나요?</h4>
                  <p className="text-xs text-slate-600 mt-0.5">전화 또는 온라인 상담을 통해 1:1로 빠르게 궁금증을 풀어드립니다.</p>
                </div>
                <button
                  onClick={() => handleNavigate('inquiry')}
                  className="px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md flex items-center gap-1.5 whitespace-nowrap"
                >
                  <FileText className="w-4 h-4" />
                  <span>1:1 수강 상담 문의하기</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 7. INQUIRY PAGE */}
        {activeSection === 'inquiry' && (
          <div className="animate-fadeIn">
            <PageHeader
              title="온라인 수강 문의"
              subtitle="1분 간편 문의 작성 또는 전화 상담 신청을 받아보세요"
              categoryName="상담신청"
              onNavigateHome={() => handleNavigate('home')}
            />
            <InquirySection preselectedCourse={preselectedCourseForInquiry} />
          </div>
        )}

        {/* 8. LOCATION PAGE */}
        {activeSection === 'location' && (
          <div className="animate-fadeIn">
            <PageHeader
              title="오시는 길 & 위치 안내"
              subtitle="강원도 홍천군 홍천읍 신장대로 48, 2층 (중앙시장 맞은편)"
              categoryName="위치안내"
              onNavigateHome={() => handleNavigate('home')}
            />
            <LocationSection />
          </div>
        )}

      </main>

      {/* Footer */}
      <Footer onNavigate={handleNavigate} />

      {/* Course Detail Modal */}
      <CourseDetailModal
        course={selectedCourseForModal}
        onClose={() => setSelectedCourseForModal(null)}
        onApply={(courseTitle) => {
          handleSelectCourseForInquiry(courseTitle);
          setSelectedCourseForModal(null);
        }}
      />

      {/* AI Consultant Modal */}
      <AiConsultantModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onNavigateToInquiry={() => handleNavigate('inquiry')}
      />

      {/* Mobile Fixed Quick Action Bar */}
      <MobileQuickBar
        onNavigate={handleNavigate}
        onOpenAiModal={() => setIsAiModalOpen(true)}
      />

    </div>
  );
}
