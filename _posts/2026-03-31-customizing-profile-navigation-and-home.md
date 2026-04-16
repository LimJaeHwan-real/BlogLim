---
title: "프로필, 탭, 홈 화면을 테마 설정으로 커스터마이징하기"
description: "브랜드 문구와 탭 노출 여부, 헤더 버튼, 홈 검색 문구, GitHub 동기화 옵션을 어디서 조절하는지 체계적으로 정리합니다."
date: 2026-03-31 09:00:00 +0900
updated_at: 2026-04-09 10:00:00 +0900
thumbnail: /assets/images/posts/customization-cover.png
series: theme-setup
tags:
  - Theme Config
  - Navigation
  - Profile
  - Customization
---

이 테마는 HTML을 직접 열지 않아도 4개의 파일만 수정하면 대부분의 커스터마이징이 끝납니다.

```text
_config.yml           사이트 URL, 제목, 외부 연동
_data/theme.yml       UI 옵션, 탭, 헤더, 검색 문구
_data/profile.yml     기본 프로필 (GitHub 미연동 시 표시)
_data/series.yml      시리즈 제목과 설명
```

## `_config.yml` — 사이트 기본 정보

가장 먼저 수정해야 하는 파일입니다. 사이트 주소와 제목이 여기에 들어갑니다.

```yml
title: 내 개발 블로그
description: 배운 것을 기록하는 공간
url: "https://username.github.io"   # 본인 GitHub 아이디로 변경
baseurl: "/my-blog"                 # 저장소 이름으로 변경
```

> **`baseurl` 설정이 틀리면 CSS, 이미지, 링크가 모두 깨집니다.**  
> 저장소 이름이 `my-blog`라면 `baseurl: "/my-blog"`, `username.github.io`라면 `baseurl: ""`로 설정하세요.

외부 서비스 연동도 여기서 합니다. 값이 비어 있으면 해당 기능은 자동으로 비활성화됩니다.

```yml
analytics:
  google:
    measurement_id: ""         # Google Analytics ID (선택)

comments:
  provider: ""                 # "giscus" 또는 "disqus" (선택)
  giscus:
    repo: "owner/repository"
    repo_id: "..."
    category: "Announcements"
    category_id: "..."

search:
  provider: local              # "local" 또는 "algolia"
```

## `_data/theme.yml` — UI 옵션과 문구

화면에 보이는 거의 모든 옵션이 이 파일에 있습니다.

### 헤더 버튼 노출 여부

```yml
header:
  show_github_link: true      # 헤더 GitHub 링크 버튼
  show_rss_link: true         # 헤더 RSS 버튼
  show_theme_toggle: true     # 라이트/다크 토글 버튼
```

### 탭 구성

```yml
tabs:
  posts_label: 글             # "글" 탭 표시 이름
  series_label: 시리즈        # "시리즈" 탭 표시 이름
  about_label: 소개           # "소개" 탭 표시 이름
  show_about: false           # 소개 탭 노출 여부 (true/false)
```

소개 페이지가 준비되지 않았다면 `show_about: false`로 숨겨두세요.

### 홈 화면 옵션

```yml
home:
  initial_post_count: 12          # 처음 로딩할 글 수
  search_placeholder: 검색어를 입력하세요
  all_posts_label: 전체보기
  more_posts_label: 스크롤하면 더 많은 글을 볼 수 있습니다.
  empty_posts_label: 조건에 맞는 글이 없습니다.
```

### GitHub 프로필 연동

```yml
hero:
  show_stats: true              # 글 수, 시리즈 수 통계 표시
  github_contributions:
    enabled: false              # 기여 그래프 사용 여부
    username: ""                # 본인 GitHub 아이디

profile:
  github_sync:
    enabled: false              # GitHub 프로필 자동 동기화
```

GitHub 연동 설정 방법은 [GitHub 프로필 동기화 글]({{ site.baseurl }}/github-profile-sync-and-contribution-graph/)에서 상세히 설명합니다.

### 푸터 문구

```yml
footer:
  tagline: Open-source Jekyll theme for developer blogs.
```

## `_data/profile.yml` — 기본 프로필

GitHub 프로필 동기화를 사용하지 않거나 동기화가 실패했을 때 보여줄 기본값입니다.

```yml
display_name: 홍길동
bio: 백엔드 개발자, 배운 것을 기록합니다
intro: 현재 Python과 Django를 주로 사용합니다
avatar: /assets/images/avatar-placeholder.svg
github: https://github.com/your-handle
```

`avatar`에는 로컬 이미지 경로 또는 외부 이미지 URL을 넣을 수 있습니다.

## `_data/series.yml` — 시리즈 정의

시리즈 키와 표시용 제목, 설명을 분리하는 파일입니다.

```yml
my-dev-log:
  title: 개발 일지
  description: 매일 배운 것을 짧게 기록합니다

backend-study:
  title: 백엔드 공부
  description: Django, Spring Boot, PostgreSQL 학습 기록
```

포스트에서는 키만 사용합니다.

```yml
---
series: my-dev-log
---
```

시리즈 제목이나 설명을 바꾸고 싶으면 각 포스트를 하나씩 수정할 필요 없이 `series.yml` 한 곳만 바꾸면 됩니다.

## 빠른 브랜드 교체 체크리스트

fork 직후 아래 순서로 빠르게 바꾸는 게 가장 효율적입니다.

- [ ] `_config.yml` — `title`, `description`, `url`, `baseurl`
- [ ] `_data/profile.yml` — 이름, 소개, GitHub 링크
- [ ] `_data/theme.yml` — 헤더 버튼, 탭 노출 여부, `footer.tagline`
- [ ] `_data/series.yml` — 샘플 시리즈 제거 후 본인 시리즈 추가
- [ ] `_posts/` — 샘플 글 유지 또는 교체

## HTML/CSS는 언제 열어야 하나요?

대부분은 데이터 파일 수정만으로 충분하지만, 아래 경우에는 템플릿이나 CSS를 직접 수정해야 합니다.

- 카드 간격이나 폰트 크기를 바꾸고 싶을 때 → `assets/css/`
- 레이아웃 구조를 바꾸고 싶을 때 → `_layouts/`, `_includes/`
- 헤더 아이콘 모양을 교체하고 싶을 때 → `_includes/`

**기준:** 텍스트와 옵션은 데이터 파일, 구조와 스타일은 레이아웃/CSS.

## 다음 단계

설정을 완료했다면 이제 첫 번째 글을 작성할 차례입니다.

→ **[글, 시리즈, 태그, 썸네일을 이 테마에서 다루는 방법]({{ site.baseurl }}/writing-posts-series-and-thumbnails/)**
