# 2026-09-07 Google Search Console 색인 정리

## 수정 사항

1. `robots.txt`의 Sitemap 주소를 대표 도메인 `https://jahrd.co.kr/sitemap.xml`로 통일했습니다.
2. 공지사항/교육과정 상세 정적 SEO 파일을 실제 URL과 동일한 디렉터리 구조로 생성하도록 수정했습니다.
   - 기존: `/notices/{id}.html`, `/courses/{id}.html`
   - 수정: `/notices/{id}/index.html`, `/courses/{id}/index.html`
3. canonical, sitemap, RSS, Open Graph의 대표 도메인은 기존대로 `https://jahrd.co.kr`로 유지했습니다.

## Search Console 화면 해석

- `적절한 표준 태그가 포함된 대체 페이지`는 오류가 아닙니다. www와 non-www처럼 동일한 콘텐츠의 중복 URL에서 canonical URL을 정상적으로 선택했다는 의미입니다.
- 현재 대표 URL이 non-www(`https://jahrd.co.kr`)이므로, www URL 접두어 속성에서는 일부 페이지가 대체 페이지로 표시될 수 있습니다.
- `크롤링됨 - 현재 색인이 생성되지 않음`은 개별 URL을 눌러 실제 대상 URL을 확인해야 원인별 조치가 가능합니다.
