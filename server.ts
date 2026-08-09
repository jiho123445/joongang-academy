import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Inquiry Record Type
interface InquiryRecord {
  id: string;
  name: string;
  phone: string;
  courseInterest: string;
  preferredTime: string;
  hasNaeilCard: string;
  userCategory: string;
  message: string;
  createdAt: string;
  status: '상담대기' | '상담완료' | '등록완료' | '보류';
  adminNotes?: string;
}

// Persistent Storage file path
const DATA_DIR = path.join(process.cwd(), "data");
const INQUIRIES_FILE = path.join(DATA_DIR, "inquiries.json");
const POPUP_NOTICE_FILE = path.join(DATA_DIR, "popup_notice.json");
const NOTICES_FILE = path.join(DATA_DIR, "notices.json");
const POPULAR_COURSES_FILE = path.join(DATA_DIR, "popular_courses.json");

export interface PopularCourse {
  id: string;
  badge: string;
  badgeColor?: string;
  timeSlot: string;
  startDate?: string;
  createdAt?: string;
  title: string;
  description: string;
}

const defaultPopularCourses: PopularCourse[] = [
  {
    id: 'pop-1',
    badge: '모집중 · 국비지원',
    badgeColor: 'blue',
    timeSlot: '09:30 - 12:30',
    startDate: '2026-09-01',
    createdAt: '2026-08-01',
    title: '컴퓨터활용능력 1급/2급 (실기)',
    description: '자부담금 0원~최대 100% 정부지원',
  },
  {
    id: 'pop-2',
    badge: '모집중 · 인기',
    badgeColor: 'emerald',
    timeSlot: '14:00 - 17:00',
    startDate: '2026-09-01',
    createdAt: '2026-08-01',
    title: '전산세무회계 & KcLep 실무',
    description: '회계원리부터 세무 신고 실무 원스톱',
  },
  {
    id: 'pop-3',
    badge: '추천 · 오전반',
    badgeColor: 'amber',
    timeSlot: '10:00 - 12:00',
    startDate: '수시 개강',
    createdAt: '2026-08-01',
    title: '어르신 스마트폰 & 타자·컴퓨터 기초',
    description: '친절한 1:1 눈높이 특별지도',
  },
];

function getPopularCourses(): PopularCourse[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(POPULAR_COURSES_FILE)) {
      fs.writeFileSync(POPULAR_COURSES_FILE, JSON.stringify(defaultPopularCourses, null, 2), "utf-8");
      return defaultPopularCourses;
    }
    const raw = fs.readFileSync(POPULAR_COURSES_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to read popular courses file:", err);
    return defaultPopularCourses;
  }
}

function savePopularCourses(courses: PopularCourse[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(POPULAR_COURSES_FILE, JSON.stringify(courses, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save popular courses file:", err);
  }
}

export interface ScheduleItem {
  courseName: string;
  startDate: string;
  timeSlot: string;
}

export interface BoardNotice {
  id: string;
  title: string;
  date: string;
  category: string;
  content: string;
  important?: boolean;
}

const defaultBoardNotices: BoardNotice[] = [
  {
    id: 'notice-1',
    title: '2026년도 국민내일배움카드 국비지원 과정 신규 수강생 모집 안내',
    date: '2026-08-01',
    category: '국비지원',
    content: '2026년 하반기 국민내일배움카드 국비지원 신규 과정을 개강합니다.\n- 대상: 구직자, 재직자, 졸업예정자, 영세자영업자\n- 개강 과정: 컴퓨터활용능력 2급/1급, 전산세무회계, 사무자동화(OA)\n- 혜택: 훈련비 최대 100% 지원 및 출석율에 따른 매월 훈련장려금 지급\n- 문의: 033-433-1926 ~ 7 (학원 방문 및 전화 상담 환영)',
    important: true
  },
  {
    id: 'notice-2',
    title: '제8회 대한상공회의소 컴활 / ITQ 국가기술자격시험 시험일정 및 원서접수',
    date: '2026-07-25',
    category: '시험일정',
    content: '대한상공회의소 및 한국생산성본부 주관 자격시험 일정 안내입니다.\n본 학원은 상시시험 지정 시험장 연습 장비와 동일한 사양의 PC로 교육을 진행하고 있습니다.\n원서 접수 대행 및 1:1 기출 체크를 지원해 드립니다.',
    important: true
  },
  {
    id: 'notice-3',
    title: '홍천 중앙정보처리학원 모바일 겸용 반응형 홈페이지 리뉴얼 오픈!',
    date: '2026-07-15',
    category: '학원소개',
    content: '스마트폰과 태블릿, PC 어디서나 편리하게 수강정보를 확인하고 간편하게 수강 문의를 신청할 수 있도록 홈페이지가 개편되었습니다.\n많은 이용 부탁드립니다.',
    important: false
  },
  {
    id: 'notice-4',
    title: '어르신·시니어 맞춤 스마트폰 & 컴퓨터 기초반 수시 개강',
    date: '2026-07-02',
    category: '모집안내',
    content: '어르신들을 위한 느리고 친절한 컴퓨터 타자/인터넷/스마트폰 기초반이 매주 월요일 수시 개강합니다. 부모님을 위한 귀한 선물이 될 수 있습니다.',
    important: false
  }
];

function getBoardNotices(): BoardNotice[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(NOTICES_FILE)) {
      fs.writeFileSync(NOTICES_FILE, JSON.stringify(defaultBoardNotices, null, 2), "utf-8");
      return defaultBoardNotices;
    }
    const raw = fs.readFileSync(NOTICES_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to read notices file:", err);
    return defaultBoardNotices;
  }
}

function saveBoardNotices(notices: BoardNotice[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(NOTICES_FILE, JSON.stringify(notices, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save notices file:", err);
  }
}

interface PopupNotice {
  enabled: boolean;
  badgeText: string;
  title: string;
  subtitle: string;
  content: string;
  dateText: string;
  schedules?: ScheduleItem[];
  actionText: string;
  updatedAt: string;
}

const defaultPopupNotice: PopupNotice = {
  enabled: true,
  badgeText: "2026년 하반기 신규 개강 안내",
  title: "홍천 중앙정보처리학원 8~9월 수강생 모집",
  subtitle: "국비지원 최대 100% 지원 & 1:1 맞춤 실습 교육",
  content: "컴퓨터활용능력(1급/2급), 전산세무회계, 정보처리기능사/기사, GTQ/ITQ 자격증, 시니어 어르신 기초반 수강생을 모집합니다! 지금 신청하시고 국민내일배움카드 혜택을 받으세요.",
  dateText: "개강일: 2026년 8월 ~ 9월 수시 개강 (오전/오후/야간반 운영)",
  schedules: [
    { courseName: "컴퓨터활용능력 (1급 / 2급)", startDate: "8월 18일 개강", timeSlot: "오전 10:00 / 야간 19:00" },
    { courseName: "전산세무회계 (전산회계1급/세무2급)", startDate: "8월 25일 개강", timeSlot: "오후 14:00 / 야간 19:00" },
    { courseName: "시니어 어르신 왕초보 컴퓨터&스마트폰", startDate: "8월 20일 개강", timeSlot: "오후 13:30 ~ 15:00" },
    { courseName: "정보처리기능사 / GTQ 포토샵 자격증", startDate: "9월 01일 개강", timeSlot: "오후 15:30 / 야간 19:00" },
  ],
  actionText: "지금 온라인 수강신청하기",
  updatedAt: new Date().toISOString()
};

function getPopupNotice(): PopupNotice {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(POPUP_NOTICE_FILE)) {
      fs.writeFileSync(POPUP_NOTICE_FILE, JSON.stringify(defaultPopupNotice, null, 2), "utf-8");
      return defaultPopupNotice;
    }
    const raw = fs.readFileSync(POPUP_NOTICE_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to read popup notice file:", err);
    return defaultPopupNotice;
  }
}

function savePopupNotice(notice: PopupNotice) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(POPUP_NOTICE_FILE, JSON.stringify(notice, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save popup notice file:", err);
  }
}

// Helper: Ensure Data Dir & File exist
function getInquiries(): InquiryRecord[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(INQUIRIES_FILE)) {
      // Default to empty array (no sample data)
      const initialData: InquiryRecord[] = [];
      fs.writeFileSync(INQUIRIES_FILE, JSON.stringify(initialData, null, 2), "utf-8");
      return initialData;
    }
    const raw = fs.readFileSync(INQUIRIES_FILE, "utf-8");
    let inquiries: InquiryRecord[] = JSON.parse(raw);

    // Filter out sample dummy entries if present
    const sampleIds = ["J20260808-001", "J20260808-002", "J20260808-003"];
    const filtered = inquiries.filter((item) => !sampleIds.includes(item.id) && !['김철수', '이영희', '박순자'].includes(item.name));
    if (filtered.length !== inquiries.length) {
      saveInquiries(filtered);
      return filtered;
    }

    return inquiries;
  } catch (err) {
    console.error("Failed to read inquiries file:", err);
    return [];
  }
}

function saveInquiries(inquiries: InquiryRecord[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(INQUIRIES_FILE, JSON.stringify(inquiries, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save inquiries file:", err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API endpoints
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", academy: "홍천 중앙정보처리학원" });
  });

  // Popup Notice Endpoints
  app.get("/api/popup-notice", (req, res) => {
    const notice = getPopupNotice();
    return res.json({ success: true, data: notice });
  });

  // Board Notices Endpoints (공지사항 & 자격시험 일정 CRUD)
  app.get("/api/notices", (req, res) => {
    const notices = getBoardNotices();
    return res.json({ success: true, data: notices });
  });

  app.post("/api/notices", (req, res) => {
    try {
      const { title, date, category, content, important } = req.body;
      if (!title || !content) {
        return res.status(400).json({ success: false, error: "제목과 내용은 필수입니다." });
      }

      const notices = getBoardNotices();
      const newNotice: BoardNotice = {
        id: `notice-${Date.now()}`,
        title: String(title),
        date: date ? String(date) : new Date().toISOString().slice(0, 10),
        category: category ? String(category) : '모집안내',
        content: String(content),
        important: Boolean(important),
      };

      notices.unshift(newNotice);
      saveBoardNotices(notices);

      return res.json({ success: true, message: "공지가 등록되었습니다.", data: newNotice });
    } catch (err) {
      console.error("Failed to create notice:", err);
      return res.status(500).json({ success: false, error: "공지 등록 중 오류가 발생했습니다." });
    }
  });

  app.put("/api/notices/:id", (req, res) => {
    try {
      const { id } = req.params;
      const targetId = decodeURIComponent(String(id)).trim();
      const { title, date, category, content, important } = req.body;
      let notices = getBoardNotices();
      const index = notices.findIndex((n) => String(n.id).trim() === targetId);

      if (index === -1) {
        return res.status(404).json({ success: false, error: "해당 공지를 찾을 수 없습니다." });
      }

      notices[index] = {
        ...notices[index],
        title: title !== undefined ? String(title) : notices[index].title,
        date: date !== undefined ? String(date) : notices[index].date,
        category: category !== undefined ? String(category) : notices[index].category,
        content: content !== undefined ? String(content) : notices[index].content,
        important: typeof important === 'boolean' ? important : notices[index].important,
      };

      saveBoardNotices(notices);
      return res.json({ success: true, message: "공지가 수정되었습니다.", data: notices[index] });
    } catch (err) {
      console.error("Failed to update notice:", err);
      return res.status(500).json({ success: false, error: "공지 수정 중 오류가 발생했습니다." });
    }
  });

  app.delete("/api/notices/:id", (req, res) => {
    try {
      const { id } = req.params;
      const targetId = decodeURIComponent(String(id)).trim();
      let notices = getBoardNotices();
      const initialCount = notices.length;
      const filtered = notices.filter((n) => String(n.id).trim() !== targetId);

      if (filtered.length === initialCount) {
        return res.status(404).json({ success: false, error: "삭제할 공지를 찾을 수 없습니다." });
      }

      saveBoardNotices(filtered);
      console.log(`공지사항 삭제 성공 (ID: ${id})`);
      return res.json({ success: true, message: "공지가 삭제되었습니다." });
    } catch (err) {
      console.error("Failed to delete notice:", err);
      return res.status(500).json({ success: false, error: "공지 삭제 중 오류가 발생했습니다." });
    }
  });

  // Popular Courses Endpoints (실시간 인기 수강 강좌 CRUD)
  app.get("/api/popular-courses", (req, res) => {
    const courses = getPopularCourses();
    return res.json({ success: true, data: courses });
  });

  app.post("/api/popular-courses", (req, res) => {
    try {
      const { badge, badgeColor, timeSlot, startDate, title, description } = req.body;
      if (!title) {
        return res.status(400).json({ success: false, error: "강좌명은 필수입니다." });
      }

      const today = new Date().toISOString().split('T')[0];
      const courses = getPopularCourses();
      const newCourse: PopularCourse = {
        id: `pop-${Date.now()}`,
        badge: badge ? String(badge) : '모집중',
        badgeColor: badgeColor ? String(badgeColor) : 'blue',
        timeSlot: timeSlot ? String(timeSlot) : '시간 문의',
        startDate: startDate ? String(startDate) : '수시 개강',
        createdAt: today,
        title: String(title),
        description: description ? String(description) : '',
      };

      courses.unshift(newCourse);
      savePopularCourses(courses);

      return res.json({ success: true, message: "인기 강좌가 추가되었습니다.", data: newCourse });
    } catch (err) {
      console.error("Failed to create popular course:", err);
      return res.status(500).json({ success: false, error: "인기 강좌 추가 중 오류가 발생했습니다." });
    }
  });

  app.put("/api/popular-courses/:id", (req, res) => {
    try {
      const { id } = req.params;
      const targetId = decodeURIComponent(String(id)).trim();
      const { badge, badgeColor, timeSlot, startDate, title, description } = req.body;
      let courses = getPopularCourses();
      const index = courses.findIndex((c) => String(c.id).trim() === targetId);

      if (index === -1) {
        return res.status(404).json({ success: false, error: "해당 강좌를 찾을 수 없습니다." });
      }

      courses[index] = {
        ...courses[index],
        badge: badge !== undefined ? String(badge) : courses[index].badge,
        badgeColor: badgeColor !== undefined ? String(badgeColor) : courses[index].badgeColor,
        timeSlot: timeSlot !== undefined ? String(timeSlot) : courses[index].timeSlot,
        startDate: startDate !== undefined ? String(startDate) : courses[index].startDate,
        title: title !== undefined ? String(title) : courses[index].title,
        description: description !== undefined ? String(description) : courses[index].description,
      };

      savePopularCourses(courses);
      return res.json({ success: true, message: "인기 강좌가 수정되었습니다.", data: courses[index] });
    } catch (err) {
      console.error("Failed to update popular course:", err);
      return res.status(500).json({ success: false, error: "인기 강좌 수정 중 오류가 발생했습니다." });
    }
  });

  app.delete("/api/popular-courses/:id", (req, res) => {
    try {
      const { id } = req.params;
      const targetId = decodeURIComponent(String(id)).trim();
      let courses = getPopularCourses();
      const initialCount = courses.length;
      const filtered = courses.filter((c) => String(c.id).trim() !== targetId);

      if (filtered.length === initialCount) {
        return res.status(404).json({ success: false, error: "삭제할 강좌를 찾을 수 없습니다." });
      }

      savePopularCourses(filtered);
      return res.json({ success: true, message: "인기 강좌가 삭제되었습니다." });
    } catch (err) {
      console.error("Failed to delete popular course:", err);
      return res.status(500).json({ success: false, error: "인기 강좌 삭제 중 오류가 발생했습니다." });
    }
  });

  app.post("/api/popup-notice", (req, res) => {
    try {
      const { enabled, badgeText, title, subtitle, content, dateText, schedules, actionText } = req.body;
      const current = getPopupNotice();
      const updatedNotice: PopupNotice = {
        enabled: typeof enabled === 'boolean' ? enabled : current.enabled,
        badgeText: badgeText !== undefined ? String(badgeText) : current.badgeText,
        title: title !== undefined ? String(title) : current.title,
        subtitle: subtitle !== undefined ? String(subtitle) : current.subtitle,
        content: content !== undefined ? String(content) : current.content,
        dateText: dateText !== undefined ? String(dateText) : current.dateText,
        schedules: Array.isArray(schedules) ? schedules : current.schedules,
        actionText: actionText !== undefined ? String(actionText) : current.actionText,
        updatedAt: new Date().toISOString(),
      };

      savePopupNotice(updatedNotice);
      return res.json({ success: true, message: "개강 공지 팝업 설정이 저장되었습니다.", data: updatedNotice });
    } catch (err) {
      console.error("Failed to update popup notice:", err);
      return res.status(500).json({ success: false, error: "공지 설정 저장 중 오류가 발생했습니다." });
    }
  });

  // GET all accumulated inquiries (for Admin Dashboard)
  app.get("/api/inquiries", (req, res) => {
    const inquiries = getInquiries();
    return res.json({ success: true, count: inquiries.length, data: inquiries });
  });

  // Online Inquiry submission endpoint
  app.post("/api/inquiry", (req, res) => {
    const { name, phone, courseInterest, preferredTime, hasNaeilCard, userCategory, message } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ success: false, error: "이름과 연락처는 필수 입력 항목입니다." });
    }

    const inquiries = getInquiries();
    const newId = `J${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(inquiries.length + 1).padStart(3, "0")}`;

    const newRecord: InquiryRecord = {
      id: newId,
      name: name.trim(),
      phone: phone.trim(),
      courseInterest: courseInterest || "상담 후 결정",
      preferredTime: preferredTime || "상관없음",
      hasNaeilCard: hasNaeilCard || "유",
      userCategory: userCategory || "취업준비생",
      message: message ? message.trim() : "",
      createdAt: new Date().toISOString(),
      status: "상담대기",
      adminNotes: "",
    };

    inquiries.unshift(newRecord); // Add to beginning
    saveInquiries(inquiries);

    console.log("새로운 수강문의 접수 저장완료:", newRecord);

    return res.json({
      success: true,
      message: `${name}님의 수강 신청이 성공적으로 접수되었습니다. (접수번호: ${newId}) 확인 후 담당자(033-433-1926)가 친절히 연럭드리겠습니다.`,
      record: newRecord,
      receivedAt: newRecord.createdAt
    });
  });

  // PUT update inquiry status / admin notes
  app.put("/api/inquiries/:id", (req, res) => {
    const { id } = req.params;
    const targetId = decodeURIComponent(String(id)).trim();
    const { status, adminNotes } = req.body;

    const inquiries = getInquiries();
    const index = inquiries.findIndex((r) => String(r.id).trim() === targetId);

    if (index === -1) {
      return res.status(404).json({ success: false, error: "해당 신청 내역을 찾을 수 없습니다." });
    }

    if (status) inquiries[index].status = status;
    if (adminNotes !== undefined) inquiries[index].adminNotes = adminNotes;

    saveInquiries(inquiries);

    return res.json({ success: true, message: "상태가 성공적으로 업데이트되었습니다.", record: inquiries[index] });
  });

  // DELETE inquiry
  app.delete("/api/inquiries/:id", (req, res) => {
    const { id } = req.params;
    const targetId = decodeURIComponent(String(id)).trim();
    let inquiries = getInquiries();
    const initialCount = inquiries.length;
    const filtered = inquiries.filter((r) => String(r.id).trim() !== targetId);

    if (filtered.length === initialCount) {
      return res.status(404).json({ success: false, error: "삭제할 내역을 찾지 못했습니다." });
    }

    saveInquiries(filtered);
    return res.json({ success: true, message: "신청 내역이 삭제되었습니다." });
  });

  // POST batch delete or clear all
  app.post("/api/inquiries/batch-delete", (req, res) => {
    const { ids, clearAll } = req.body;
    let inquiries = getInquiries();

    if (clearAll) {
      saveInquiries([]);
      return res.json({ success: true, message: "전체 신청 내역이 삭제되었습니다." });
    }

    if (Array.isArray(ids) && ids.length > 0) {
      const initialCount = inquiries.length;
      inquiries = inquiries.filter((item) => !ids.includes(item.id));
      const deletedCount = initialCount - inquiries.length;
      saveInquiries(inquiries);
      return res.json({ success: true, message: `${deletedCount}건의 신청 내역이 삭제되었습니다.` });
    }

    return res.status(400).json({ success: false, error: "삭제할 항목이 선택되지 않았습니다." });
  });

  // AI Course Advice Endpoint using Gemini
  app.post("/api/ask-ai", async (req, res) => {
    try {
      const { userQuery, userCategory, goal } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.json({
          reply: `안녕하세요! 홍천 중앙정보처리학원 AI 수강 도우미입니다.\n\n질문하신 내용은 원장님 또는 전문 상담 직원을 통해 친절하게 안내받으실 수 있습니다.\n\n📞 학원 전화: 033-433-1926 ~ 7\n📍 위치: 강원도 홍천군 홍천읍 신장대로 48, 2층\n\n국민내일배움카드 국비지원 과정 및 컴퓨터활용능력, 전산세무회계, 시니어 컴퓨터 등 맞춤형 상담을 진행해 드립니다.`
        });
      }

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
너는 '홍천 중앙정보처리학원(jahrd.com, 1999년 설립, 강원도 홍천군 홍천읍 신장대로 48 2층, 전화 033-433-1926)'의 친절하고 전문적인 AI 수강 상담 선생님이야.

[학원 주요 특징]
1. 1999년 설립된 25년 전통의 홍천 대표 컴퓨터/IT 교육기관
2. 고용노동부 지정 국민내일배움카드 국비지원 지정 학원 (수강료 최대 100% 무료 지원)
3. 대표 과정: 컴퓨터활용능력(1급/2급), 전산세무회계, 정보처리기능사/산업기사/기사, ITQ/GTQ 자격증, 시니어/어르신 컴퓨터&스마트폰 기초, 파이썬 코딩 및 AI 활용, 초중고 방학특강
4. 1인 1대 최신 컴퓨터 실습, 1:1 맞춤 친절 지도

[사용자 정보]
- 사용자 분류: ${userCategory || "미지정"}
- 학습 목표: ${goal || "미지정"}
- 사용자 질문: ${userQuery || "나에게 맞는 수강 과정을 추천해주세요."}

[응답 지침]
- 정중하고 친절한 어조로 한국어로 답변해줘.
- 질문자의 상황에 부합하는 홍천 중앙정보처리학원의 강좌를 1~2개 추천하고, 왜 맞는지 간단히 설명해줘.
- 국비지원(국민내일배움카드) 대상일 수 있다면 그 점을 언급하고 학원 방문/전화 상담(033-433-1926)을 유도해줘.
- 답변은 300자 이내로 핵심 위주로 명확하고 읽기 쉽게 작성해줘.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      return res.json({ reply: response.text || "상담 요청에 응답할 수 없습니다. 학원으로 직접 문의해 주세요 (033-433-1926)." });
    } catch (error) {
      console.error("Gemini API Error:", error);
      return res.json({
        reply: `안녕하세요! 질문해 주셔서 감사합니다.\n\n고객님의 상황에 맞는 맞춤형 수강 과정과 국비지원 자격 여부는 학원으로 전화(033-433-1926) 주시면 가장 정확하게 안내해 드립니다.`
      });
    }
  });

  // Vite middleware for development vs static in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Hongcheon JAHRD Server running on http://localhost:${PORT}`);
  });
}

startServer();
