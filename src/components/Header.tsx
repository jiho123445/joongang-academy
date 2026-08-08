import React, { useState, useEffect } from 'react';
import { Phone, MapPin, Menu, X, GraduationCap, ChevronRight, Award, Bot, FileText, Calendar } from 'lucide-react';
import { ACADEMY_INFO } from '../data/coursesData';

interface HeaderProps {
  activeSection: string;
  onNavigate: (sectionId: string) => void;
  onOpenAiModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeSection, onNavigate, onOpenAiModal }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { id: 'courses', label: '교육과정' },
    { id: 'national-support', label: '국비지원(내일배움)' },
    { id: 'calculator', label: '수강료 계산기' },
    { id: 'intro', label: '학원소개' },
    { id: 'notices', label: '공지·시험일정' },
    { id: 'inquiry', label: '온라인 수강문의' },
    { id: 'location', label: '오시는길' },
  ];

  const handleNavClick = (id: string) => {
    onNavigate(id);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/50 backdrop-blur-md border-b border-white/50 shadow-sm transition-all duration-200">
      {/* Top Banner Contact Strip (Desktop & Mobile) */}
      <div className="bg-slate-900/90 backdrop-blur-md text-slate-200 text-xs py-1.5 px-4 border-b border-white/10">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-4 text-slate-300">
            <span className="inline-flex items-center gap-1 font-medium text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              2026년 국민내일배움카드 신규 모집중
            </span>
            <span className="hidden sm:inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {ACADEMY_INFO.address}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={`tel:${ACADEMY_INFO.phoneClean}`}
              className="inline-flex items-center gap-1 hover:text-white font-semibold transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-blue-400" />
              <span>상담전화: {ACADEMY_INFO.phone}</span>
            </a>
            <button
              onClick={onOpenAiModal}
              className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-medium text-[11px] shadow-sm shadow-blue-300 transition-colors"
            >
              <Bot className="w-3 h-3" />
              <span>AI 수강추천</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all ${isScrolled ? 'py-2.5' : 'py-3.5'}`}>
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div
            onClick={() => handleNavClick('hero')}
            className="flex items-center gap-3 cursor-pointer group"
            id="header-logo"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-200 group-hover:bg-blue-700 transition-colors">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg sm:text-xl text-slate-800 tracking-tight leading-none group-hover:text-blue-600 transition-colors">
                  홍천 중앙정보처리학원
                </span>
                <span className="bg-blue-100/80 backdrop-blur-sm text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200">
                  SINCE 1969
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                고용노동부 국비지원 지정 IT·컴퓨터 교육기관
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            {navItems.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  id={`nav-${item.id}`}
                  className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-200'
                      : 'text-slate-600 hover:text-blue-600 hover:bg-white/60'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Header Action Buttons */}
          <div className="hidden sm:flex items-center gap-2.5">
            <button
              onClick={() => handleNavClick('inquiry')}
              id="header-inquiry-btn"
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-200 hover:shadow-blue-300 transition-all"
            >
              <FileText className="w-4 h-4" />
              <span>수강 문의</span>
            </button>
          </div>

          {/* Mobile Hamburger Menu Toggle */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              onClick={onOpenAiModal}
              className="p-2 text-blue-700 bg-white/80 hover:bg-white rounded-xl text-xs font-semibold flex items-center gap-1 border border-white/60 shadow-sm"
              title="AI 상담"
            >
              <Bot className="w-4 h-4 text-blue-600" />
              <span className="hidden xs:inline">AI상담</span>
            </button>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              id="mobile-menu-toggle"
              className="p-2.5 rounded-xl text-slate-700 bg-white/60 hover:bg-white/90 border border-white/50 focus:outline-none"
              aria-label="메뉴 열기"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-white/60 bg-white/80 backdrop-blur-xl shadow-2xl px-4 pt-3 pb-6 space-y-2 animate-fadeIn">
          <div className="p-3 bg-white/60 backdrop-blur-md rounded-2xl mb-3 flex items-center justify-between border border-white/80 shadow-sm">
            <div>
              <p className="text-xs text-blue-900 font-bold">전화 상담 및 수강 문의</p>
              <p className="text-sm font-extrabold text-blue-700">{ACADEMY_INFO.phone}</p>
            </div>
            <a
              href={`tel:${ACADEMY_INFO.phoneClean}`}
              className="px-3.5 py-1.5 bg-blue-600 text-white font-bold text-xs rounded-full shadow-md shadow-blue-200"
            >
              즉시 통화
            </a>
          </div>

          <div className="grid grid-cols-1 gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left text-sm font-bold transition-colors ${
                  activeSection === item.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-800 hover:bg-white/60'
                }`}
              >
                <span>{item.label}</span>
                <ChevronRight className="w-4 h-4 opacity-70" />
              </button>
            ))}
          </div>

          <div className="pt-2 grid grid-cols-2 gap-2">
            <button
              onClick={() => handleNavClick('inquiry')}
              className="w-full py-3 bg-blue-600 text-white font-bold text-sm rounded-xl text-center shadow-lg shadow-blue-200"
            >
              온라인 수강신청
            </button>
            <button
              onClick={onOpenAiModal}
              className="w-full py-3 bg-slate-900 text-white font-bold text-sm rounded-xl text-center flex items-center justify-center gap-1.5 shadow"
            >
              <Bot className="w-4 h-4 text-blue-400" />
              AI 수강 도우미
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
