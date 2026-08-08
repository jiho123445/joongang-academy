import React, { useState } from 'react';
import { Course } from './types';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
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

export default function App() {
  const [activeSection, setActiveSection] = useState<string>('hero');
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');
  const [selectedCourseForModal, setSelectedCourseForModal] = useState<Course | null>(null);
  const [preselectedCourseForInquiry, setPreselectedCourseForInquiry] = useState<string>('');
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);

  const handleNavigate = (sectionId: string) => {
    setActiveSection(sectionId);
    if (sectionId === 'hero') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const elem = document.getElementById(sectionId);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSelectCourseForInquiry = (courseTitle: string) => {
    setPreselectedCourseForInquiry(courseTitle);
    handleNavigate('inquiry');
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-900 font-sans antialiased selection:bg-blue-600 selection:text-white pb-12 lg:pb-0">
      
      {/* Header */}
      <Header
        activeSection={activeSection}
        onNavigate={handleNavigate}
        onOpenAiModal={() => setIsAiModalOpen(true)}
      />

      {/* Main Content Sections */}
      <main>
        {/* Hero Section */}
        <HeroSection
          onNavigate={handleNavigate}
          onOpenAiModal={() => setIsAiModalOpen(true)}
          onSelectCategory={(cat) => setSelectedCategory(cat)}
        />

        {/* Course Explorer */}
        <CourseExplorer
          selectedCategory={selectedCategory}
          onSelectCategory={(cat) => setSelectedCategory(cat)}
          onOpenDetailModal={(course) => setSelectedCourseForModal(course)}
          onSelectCourseForInquiry={handleSelectCourseForInquiry}
        />

        {/* National Support (내일배움카드) Guide & Quiz */}
        <NationalSupportGuide
          onNavigateToInquiry={() => handleNavigate('inquiry')}
        />

        {/* Interactive Tuition & Support Calculator */}
        <CalculatorSection
          onSelectCourseForInquiry={handleSelectCourseForInquiry}
        />

        {/* Academy Introduction & History */}
        <AcademyIntro />

        {/* Notice & Exam Schedule Board */}
        <NoticeBoard />

        {/* FAQ Accordion */}
        <FaqSection />

        {/* Online Inquiry Form */}
        <InquirySection
          preselectedCourse={preselectedCourseForInquiry}
        />

        {/* Location & Directions Map */}
        <LocationSection />
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

      {/* Mobile Fixed Action Bar */}
      <MobileQuickBar
        onNavigate={handleNavigate}
        onOpenAiModal={() => setIsAiModalOpen(true)}
      />

    </div>
  );
}
