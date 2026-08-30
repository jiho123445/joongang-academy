/**
 * seo.ts - 페이지(섹션)별 <title>/description/canonical/OG 태그를 동적으로
 * 갱신하는 헬퍼입니다.
 *
 * (2026-08 보안·SEO 점검 반영) 이 사이트는 React SPA라서 실제 HTML은
 * 하나뿐이고, /courses나 /notices/:id로 주소가 달라져도 <title>은 계속
 * index.html에 적힌 고정값("홍천 중앙정보처리학원 | 국비지원 컴퓨터·IT
 * 교육")만 나오고 있었습니다. 검색엔진에는 모든 페이지가 똑같은 제목으로
 *보여서, 예를 들어 "컴퓨터활용능력 1급 홍천"으로 검색했을 때 교육과정
 * 페이지가 그 검색어에 맞춰 따로 최적화되지 못하는 문제가 있었습니다.
 *
 * SSR/SSG 없이도, 페이지 전환마다 이 함수로 <title>과 관련 메타 태그를
 * 갱신하면 브라우저 탭 제목과 카카오톡/문자 링크 미리보기, 그리고 검색
 * 크롤러가 페이지를 재방문할 때(재크롤링) 각기 다른 제목/설명을 인식할
 * 수 있습니다. 완전한 SSR만큼의 효과는 아니지만, 지금 학원 홈페이지
 * 규모에서는 이 정도로 충분합니다.
 */

const SITE_NAME = "홍천 중앙정보처리학원";
const SITE_ORIGIN = "https://www.jahrd.co.kr";
const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/og-image.jpg`;

function setMetaByName(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setMetaByProperty(property: string, content: string) {
  let el = document.querySelector(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(href: string) {
  let el = document.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export function updatePageMeta(params: {
  title: string;
  description: string;
  path: string; // "/", "/courses", "/notices/abc123" 등 — SITE_ORIGIN과 합쳐서 canonical/og:url을 만듭니다.
  image?: string;
  keywords?: string;
  /** 공지/강좌 상세처럼 개별 콘텐츠 페이지면 true — JSON-LD @type을 Article로 씁니다. */
  isDetail?: boolean;
  /**
   * true면 title을 그대로 <title>에 씁니다(앞에 "학원명 | "를 자동으로 붙이지
   * 않음). 홈 화면처럼 "홍천컴퓨터학원 | 홍천 중앙정보처리학원 | ..." 같이
   * 자체적으로 완성된 제목 문자열을 index.html과 동일하게 유지해야 할 때
   * 씁니다.
   *
   * ⚠️ 왜 필요한가: 이 함수는 페이지가 열릴 때마다(App.tsx의 useEffect) 호출돼
   * index.html에 적힌 <title>/description을 덮어씁니다. 예전에는 홈 화면
   * title도 무조건 "학원명 | 짧은제목"으로 재조립했는데, index.html의 실제
   * <title>은 "홍천컴퓨터학원 | 홍천 중앙정보처리학원 | ..." 형태라 서로 달라서,
   * 정적 HTML(비-JS 크롤러가 보는 값)과 자바스크립트 실행 후 값(JS를 실행하는
   * 크롤러·실제 방문자가 보는 값)이 서로 다른 상태가 됐습니다 — index.html만
   * 고쳐서는 실제로 반영되지 않고 몇 초 뒤 이 값으로 다시 덮어써지는 버그였습니다.
   */
  titleIsFull?: boolean;
}) {
  // index.html의 원래 기본 제목("홍천 중앙정보처리학원 | 국비지원 컴퓨터·IT
  // 교육")과 동일한 순서(학원명이 앞)를 유지합니다.
  const fullTitle = params.titleIsFull ? params.title : `${SITE_NAME} | ${params.title}`;
  const url = `${SITE_ORIGIN}${params.path}`;
  const image = params.image || DEFAULT_OG_IMAGE;

  document.title = fullTitle;
  setMetaByName("description", params.description);
  if (params.keywords) setMetaByName("keywords", params.keywords);
  setCanonical(url);

  setMetaByProperty("og:site_name", SITE_NAME);
  setMetaByProperty("og:title", fullTitle);
  setMetaByProperty("og:description", params.description);
  setMetaByProperty("og:url", url);
  setMetaByProperty("og:image", image);

  setMetaByName("twitter:title", fullTitle);
  setMetaByName("twitter:description", params.description);
  setMetaByName("twitter:image", image);

  // 재단 홈페이지(nbnhappy.or.kr)의 SEOHead.tsx와 동일한 패턴: 페이지 전환마다
  // 그 페이지 전용 JSON-LD를 새로 만들어 <head>에 넣습니다. index.html의
  // 고정 JSON-LD(@id: #organization, #website)를 about/isPartOf로 참조해
  // "이 페이지가 어느 조직/사이트에 속하는가"를 검색엔진에 명시합니다.
  const id = "dynamic-seo-jsonld";
  document.getElementById(id)?.remove();
  const script = document.createElement("script");
  script.id = id;
  script.type = "application/ld+json";
  script.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": params.isDetail ? "Article" : "WebPage",
    "@id": `${url}#webpage`,
    name: fullTitle,
    headline: fullTitle,
    description: params.description,
    url,
    inLanguage: "ko-KR",
    isPartOf: { "@id": `${SITE_ORIGIN}/#website` },
    about: { "@id": `${SITE_ORIGIN}/#organization` },
    ...(params.isDetail ? { image, publisher: { "@id": `${SITE_ORIGIN}/#organization` } } : {}),
  });
  document.head.appendChild(script);
}
