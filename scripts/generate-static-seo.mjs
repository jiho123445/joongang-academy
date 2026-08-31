// 빌드타임(`npm run build`, vite build 이후)에 실행되어 정적 SEO 자산 3가지를
// 한 번에 만듭니다: (1) 공지/강좌 개별 미리보기 페이지, (2) sitemap.xml,
// (3) rss.xml. 재단 홈페이지(nbnhappy.or.kr)의 scripts/generate-previews.mjs와
// 같은 원리(Firestore REST API를 빌드타임에 한 번 호출해 dist/에 정적 파일을
// 추가로 만듦)를 따르되, 한 번의 Firestore 호출로 세 가지를 모두 만들도록
// 통합했습니다.
//
// 왜 필요한가:
// - 이 앱은 클라이언트 렌더링 SPA라서, 실제 HTML은 index.html 하나뿐입니다.
//   카카오톡/문자 링크 미리보기나 네이버·구글 크롤러처럼 JS를 실행하지 않고
//   HTML만 읽는 주체에게는 어떤 공지/강좌를 공유해도 항상 홈 화면과 똑같은
//   제목/설명만 보입니다.
// - 예전 sitemap은 매 요청마다 Vercel 서버리스 함수(api/sitemap.ts)가
//   Firestore를 실시간 호출하는 방식이었는데, 재단 홈페이지에서 바로 이
//   구조(서버리스 함수가 요청마다 외부 API를 호출하는 sitemap)가 실제
//   프로덕션에서 FUNCTION_INVOCATION_FAILED로 죽은 적이 있어(재단 홈페이지는
//   이후 빌드타임 정적 파일로 전환), 이 학원 홈페이지도 같은 위험을 안고
//   있었습니다. 이 스크립트는 그 구조를 제거하고 빌드타임에 완성된 정적
//   파일을 만들어, 방문자 요청 경로에서는 서버 코드가 전혀 실행되지 않게
//   합니다.
//
// 안전장치: 이 스크립트가 실패하거나 Firestore를 빌드 환경에서 호출할 수
// 없어도(네트워크 차단 등) 경고만 남기고 정상 종료합니다 — 이 스크립트
//때문에 전체 빌드가 실패하는 일은 없습니다. 이미 만들어진 dist/index.html과
// 나머지 정적 자산은 그대로 배포됩니다.

import fs from "fs";
import path from "path";

const PROJECT_ID = "joongang-homepage";
// (2026-08) www.jahrd.co.kr는 실제로 jahrd.co.kr(www 없음)로 301 리다이렉트되는
// 주소입니다. sitemap.xml/rss.xml/미리보기 페이지에 www 주소를 넣으면 검색
// 엔진이 그 URL을 가져올 때마다 리다이렉트를 한 번 더 타야 해서, 대표 주소를
// jahrd.co.kr(www 없음)로 통일합니다.
const SITE_ORIGIN = "https://jahrd.co.kr";
const SITE_NAME = "홍천 중앙정보처리학원";
const DIST_DIR = path.join(process.cwd(), "dist");

// 이 SPA가 실제로 인식하는 최상위 경로. src/App.tsx의 VALID_SECTIONS와
// 반드시 동일하게 유지해야 합니다. 재단 홈페이지에서 겪었던 문제(vercel.json의
// catch-all rewrite가 일부 배포 환경에서 신뢰할 수 없게 동작해 /news 같은
// 맨 경로가 404났던 사례)를 예방하기 위해, 라우팅 설정을 신뢰하는 대신 각
// 경로에 실제 파일을 하나씩 만들어 둡니다.
const TOP_LEVEL_ROUTES = [
  "courses",
  "national-support",
  "intro",
  "notices",
  "inquiry",
  "location",
  "materials",
];

function unwrapFirestoreValue(value) {
  if (value == null) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("nullValue" in value) return null;
  if ("timestampValue" in value) return value.timestampValue;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(unwrapFirestoreValue);
  if ("mapValue" in value) {
    const out = {};
    const fields = value.mapValue.fields || {};
    for (const key of Object.keys(fields)) out[key] = unwrapFirestoreValue(fields[key]);
    return out;
  }
  return null;
}

function escapeHtml(input) {
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeXml(input) {
  return escapeHtml(input);
}

function truncate(text, max) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max - 1) + "…" : clean;
}

async function fetchDocs(collectionName) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collectionName}?pageSize=300`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    const docs = json.documents || [];
    return docs.map((d) => {
      const id = String(d.name || "").split("/").pop();
      const fields = d.fields || {};
      const data = {};
      for (const key of Object.keys(fields)) data[key] = unwrapFirestoreValue(fields[key]);
      // updateTime은 Firestore 문서 메타데이터로, 실제 마지막 수정 시각을
      // 정확히 담고 있어(필드 값으로 관리하는 createdAt/updatedAt보다
      // 신뢰도가 높음) sitemap의 lastmod로 사용합니다.
      return { id, data, updateTime: d.updateTime || null };
    });
  } catch {
    return [];
  }
}

function buildPreviewHtml(shellHtml, opts) {
  const { title, description, image, canonicalPath } = opts;
  const fullTitle = `${SITE_NAME} | ${title}`;
  const canonicalUrl = `${SITE_ORIGIN}${canonicalPath}`;
  const ogImage = image || `${SITE_ORIGIN}/og-image.jpg`;

  let html = shellHtml;
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(fullTitle)}</title>`);

  const metaReplacements = [
    [/(<meta\s+name="description"\s+content=")[^"]*(")/, `$1${escapeHtml(description)}$2`],
    [/(<meta\s+property="og:title"\s+content=")[^"]*(")/, `$1${escapeHtml(fullTitle)}$2`],
    [/(<meta\s+property="og:description"\s+content=")[^"]*(")/, `$1${escapeHtml(description)}$2`],
    [/(<meta\s+property="og:image"\s+content=")[^"]*(")/, `$1${escapeHtml(ogImage)}$2`],
    [/(<meta\s+property="og:image:secure_url"\s+content=")[^"]*(")/, `$1${escapeHtml(ogImage)}$2`],
    [/(<meta\s+property="og:url"\s+content=")[^"]*(")/, `$1${escapeHtml(canonicalUrl)}$2`],
    [/(<meta\s+name="twitter:title"\s+content=")[^"]*(")/, `$1${escapeHtml(fullTitle)}$2`],
    [/(<meta\s+name="twitter:description"\s+content=")[^"]*(")/, `$1${escapeHtml(description)}$2`],
    [/(<meta\s+name="twitter:image"\s+content=")[^"]*(")/, `$1${escapeHtml(ogImage)}$2`],
  ];
  for (const [pattern, replacement] of metaReplacements) {
    html = html.replace(pattern, replacement);
  }
  html = html.replace(
    /<link rel="canonical" href="[^"]*" \/>/,
    `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`
  );

  return html;
}

function buildSitemap(urls) {
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => {
      const lastmodTag = u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : "";
      return `  <url>\n    <loc>${u.loc}</loc>${lastmodTag}\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`;
    })
    .join("\n")}\n</urlset>\n`;
  return body;
}

function buildRss(items) {
  const nowRfc822 = new Date().toUTCString();
  const itemsXml = items
    .map((it) => {
      const link = `${SITE_ORIGIN}${it.path}`;
      const pubDate = it.date ? new Date(it.date).toUTCString() : nowRfc822;
      return `    <item>\n      <title>${escapeXml(it.title)}</title>\n      <link>${link}</link>\n      <guid isPermaLink="true">${link}</guid>\n      <pubDate>${pubDate}</pubDate>\n      <description>${escapeXml(it.description)}</description>\n    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n  <channel>\n    <title>${escapeXml(SITE_NAME)} 공지사항</title>\n    <link>${SITE_ORIGIN}/notices</link>\n    <description>${escapeXml(SITE_NAME)}의 모집안내, 시험일정, 국비지원 공지사항입니다.</description>\n    <language>ko-KR</language>\n    <lastBuildDate>${nowRfc822}</lastBuildDate>\n${itemsXml}\n  </channel>\n</rss>\n`;
}

async function main() {
  let shellHtml;
  try {
    shellHtml = fs.readFileSync(path.join(DIST_DIR, "index.html"), "utf-8");
  } catch {
    console.warn("[generate-static-seo] dist/index.html not found, skipping.");
    return;
  }

  // 1) 최상위 경로마다 실제 index.html 파일을 만들어 둡니다(라우팅 설정에만
  // 의존하지 않기 위한 방어 조치).
  for (const route of TOP_LEVEL_ROUTES) {
    const dir = path.join(DIST_DIR, route);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), shellHtml, "utf-8");
  }

  const [notices, courses] = await Promise.all([fetchDocs("notices"), fetchDocs("courses")]);

  if (notices.length === 0 && courses.length === 0) {
    console.warn(
      "[generate-static-seo] Firestore에서 notices/courses를 하나도 가져오지 못했습니다" +
        "(네트워크 차단 또는 빌드 환경 문제일 수 있음). 최상위 경로 파일은 만들었지만, " +
        "개별 미리보기/전체 sitemap·rss는 건너뜁니다."
    );
  }

  // 2) 공지/강좌 개별 미리보기 페이지
  const noticesDir = path.join(DIST_DIR, "notices");
  const coursesDir = path.join(DIST_DIR, "courses");
  fs.mkdirSync(noticesDir, { recursive: true });
  fs.mkdirSync(coursesDir, { recursive: true });

  let previewCount = 0;
  for (const { id, data } of notices) {
    if (!id) continue;
    const html = buildPreviewHtml(shellHtml, {
      title: data.title || "공지사항",
      description: truncate(data.content || "", 120) || `${data.category || "공지사항"} 안내`,
      canonicalPath: `/notices/${encodeURIComponent(id)}`,
    });
    fs.writeFileSync(path.join(noticesDir, `${id}.html`), html, "utf-8");
    previewCount++;
  }
  for (const { id, data } of courses) {
    if (!id) continue;
    const html = buildPreviewHtml(shellHtml, {
      title: data.title || "교육과정",
      description: truncate(data.summary || data.description || "", 120) || "교육과정 안내",
      canonicalPath: `/courses/${encodeURIComponent(id)}`,
    });
    fs.writeFileSync(path.join(coursesDir, `${id}.html`), html, "utf-8");
    previewCount++;
  }

  // 3) sitemap.xml (lastmod 포함)
  const todayIso = new Date().toISOString().slice(0, 10);
  const urls = [
    { loc: `${SITE_ORIGIN}/`, changefreq: "weekly", priority: "1.0", lastmod: todayIso },
    { loc: `${SITE_ORIGIN}/courses`, changefreq: "weekly", priority: "0.9", lastmod: todayIso },
    { loc: `${SITE_ORIGIN}/national-support`, changefreq: "monthly", priority: "0.8", lastmod: todayIso },
    { loc: `${SITE_ORIGIN}/intro`, changefreq: "monthly", priority: "0.7", lastmod: todayIso },
    { loc: `${SITE_ORIGIN}/notices`, changefreq: "daily", priority: "0.8", lastmod: todayIso },
    { loc: `${SITE_ORIGIN}/inquiry`, changefreq: "monthly", priority: "0.7", lastmod: todayIso },
    { loc: `${SITE_ORIGIN}/location`, changefreq: "monthly", priority: "0.6", lastmod: todayIso },
    { loc: `${SITE_ORIGIN}/materials`, changefreq: "monthly", priority: "0.5", lastmod: todayIso },
  ];
  for (const { id, updateTime } of notices) {
    if (!id) continue;
    urls.push({
      loc: `${SITE_ORIGIN}/notices/${encodeURIComponent(id)}`,
      changefreq: "monthly",
      priority: "0.5",
      lastmod: updateTime ? updateTime.slice(0, 10) : todayIso,
    });
  }
  for (const { id, updateTime } of courses) {
    if (!id) continue;
    urls.push({
      loc: `${SITE_ORIGIN}/courses/${encodeURIComponent(id)}`,
      changefreq: "monthly",
      priority: "0.6",
      lastmod: updateTime ? updateTime.slice(0, 10) : todayIso,
    });
  }
  fs.writeFileSync(path.join(DIST_DIR, "sitemap.xml"), buildSitemap(urls), "utf-8");

  // 4) rss.xml — 최신 공지사항 20건 (날짜 최신순)
  const rssItems = notices
    .slice()
    .sort((a, b) => String(b.data.date || "").localeCompare(String(a.data.date || "")))
    .slice(0, 20)
    .map(({ id, data }) => ({
      title: data.title || "공지사항",
      description: truncate(data.content || "", 200),
      path: `/notices/${encodeURIComponent(id)}`,
      date: data.date,
    }));
  fs.writeFileSync(path.join(DIST_DIR, "rss.xml"), buildRss(rssItems), "utf-8");

  console.log(
    `[generate-static-seo] 완료: 미리보기 ${previewCount}개, sitemap URL ${urls.length}개, rss 항목 ${rssItems.length}개.`
  );
}

main().catch((e) => {
  // 이 스크립트가 실패해도 빌드 자체는 성공해야 합니다.
  console.warn("[generate-static-seo] 예기치 않은 오류, 건너뜁니다:", e);
});
