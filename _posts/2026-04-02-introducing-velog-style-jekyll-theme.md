---
title: "Velog Style Jekyll Theme 소개"
description: "velog의 읽기 흐름을 참고해 Jekyll과 GitHub Pages에 맞게 다시 구성한 오픈소스 개발 블로그 테마를 소개합니다."
date: 2026-04-02 09:00:00 +0900
updated_at: 2026-04-09 10:00:00 +0900
thumbnail: /assets/images/posts/theme-intro-cover.png
series: theme-overview
tags:
  - Jekyll Theme
  - Velog Style
  - GitHub Pages
  - Open Source
---

이 테마는 `읽기 편한 글 목록`, `시리즈`, `태그`, `검색`, `GitHub 프로필 동기화`, `기여 그래프`를 한 번에 갖춘 Jekyll 기반 개발 블로그 출발점입니다.

단순히 보기 좋은 화면만 넣는 대신, 저장소를 복제한 뒤 어떻게 설정하고 운영하는지까지 문서형 데모로 함께 제공하는 것을 목표로 만들었습니다. 지금 보고 있는 이 블로그 자체가 그 데모입니다.

## 이 테마로 뭘 만들 수 있나요?

GitHub Pages를 이용한 **무료 개발 블로그**를 만들 수 있습니다. 별도 서버나 비용 없이, 이 저장소를 fork하고 설정 파일 몇 줄만 바꾸면 됩니다.

완성된 블로그에는 아래 기능이 모두 포함되어 있습니다.

- **글 목록**: 태그 필터, 검색, 페이지 없이 스크롤로 더 불러오기
- **시리즈**: 연관된 글을 묶어서 카드형으로 탐색
- **GitHub 프로필**: 이름, 아바타, 기여 그래프 자동 동기화
- **다크 모드**: 시스템 설정 자동 감지 + 토글
- **댓글**: Giscus(GitHub Discussions 기반) 또는 Disqus 선택
- **검색**: 기본 로컬 검색 또는 Algolia 고급 검색

## 화면 미리보기

### 홈

<img src="{{ '/assets/images/docs/home-preview.png' | relative_url }}" alt="홈 화면 미리보기">

홈에서는 프로필, 기여 그래프, 태그 목록, 글 목록을 한 화면 흐름 안에서 볼 수 있습니다.

### 시리즈

<img src="{{ '/assets/images/docs/series-preview.png' | relative_url }}" alt="시리즈 화면 미리보기">

시리즈 탭은 카드형 레이아웃으로, 연재 묶음을 한눈에 탐색할 수 있습니다.

### 글 상세

<img src="{{ '/assets/images/docs/post-preview.png' | relative_url }}" alt="글 상세 화면 미리보기">

시리즈명, 제목, 태그, 본문, 이전/다음 포스트까지 한 흐름으로 이어집니다.

## GitHub Pages가 처음이라면

> **GitHub Pages**는 GitHub 저장소를 그대로 웹사이트로 호스팅해주는 무료 서비스입니다.  
> 코드를 push하면 자동으로 빌드되어 `username.github.io` 주소로 블로그가 열립니다.

필요한 것은 GitHub 계정뿐입니다. 코딩 경험이 없어도 이 저장소를 fork하고 설정 파일을 웹에서 직접 편집하는 것만으로 블로그를 만들 수 있습니다.

## 5분 안에 배포하는 방법

### 1. 이 저장소 fork하기

이 페이지 오른쪽 위 **Fork** 버튼을 클릭합니다.  
저장소 이름을 정할 때 아래 표를 참고하세요.

| 원하는 주소 | 저장소 이름 | `_config.yml`의 `baseurl` |
|---|---|---|
| `username.github.io` | `username.github.io` | `""` (빈값) |
| `username.github.io/my-blog` | `my-blog` | `"/my-blog"` |

`username`은 본인 GitHub 아이디입니다.

### 2. `_config.yml` 수정하기

fork한 저장소에서 `_config.yml` 파일을 열고 연필 아이콘(✏️)으로 편집합니다.

```yml
title: 내 블로그 이름
description: 블로그 한 줄 설명
url: "https://username.github.io"   # 본인 GitHub 아이디로 변경
baseurl: "/my-blog"                 # 저장소 이름에 맞게 변경
```

수정 후 **Commit changes**를 누르면 자동 빌드가 시작됩니다.

### 3. GitHub Pages 활성화하기

저장소 **Settings → Pages**로 이동해서:

1. Source: `Deploy from a branch`
2. Branch: `gh-pages`, Folder: `/ (root)`
3. Save

빌드가 완료되면 설정한 주소로 블로그에 접속할 수 있습니다. 첫 빌드는 1~2분 정도 걸립니다.

## 디렉터리 구조 한눈에 보기

처음에는 이 다섯 묶음만 알면 됩니다.

```text
_config.yml               사이트 URL, 제목, 외부 연동 설정
_data/profile.yml         기본 프로필 (GitHub 미연동 시 표시)
_data/theme.yml           UI 옵션, 탭 노출, 검색 문구 등
_data/series.yml          시리즈 제목과 설명
_posts/                   블로그 글 파일들 (날짜-제목.md 형식)
```

CSS와 레이아웃은 이미 완성되어 있습니다. 처음에는 HTML/CSS를 열지 않아도 됩니다.

## 이 테마가 특히 잘 맞는 경우

- GitHub Pages 위에 개발 블로그를 빠르게 올리고 싶은 경우
- velog처럼 가볍게 읽히는 목록 구조를 선호하는 경우
- 글, 시리즈, 태그, 검색이 처음부터 갖춰진 출발점이 필요한 경우
- GitHub 프로필을 블로그 홈에 보여주고 싶은 경우

## 데모 글이 하는 역할

지금 보고 있는 이 블로그의 `_posts` 폴더에는 lorem ipsum 대신 **테마 사용 설명서 역할을 하는 글들**이 들어 있습니다.

- 로컬 설치 방법
- 설정 파일 커스터마이징
- 글과 시리즈 작성 방법
- GitHub Pages 배포
- GitHub 프로필 동기화

fork 후 이 글들을 지우고 본인 글로 채워도 되고, 참고 자료로 유지해도 됩니다.

## 다음 단계

이 시리즈를 순서대로 읽으면 처음부터 배포까지 전체 흐름을 파악할 수 있습니다.

1. **[로컬에서 테마를 설치하고 미리보기하는 가장 빠른 방법]({{ site.baseurl }}/installing-the-theme-locally/)** — Ruby 설치부터 로컬 미리보기까지
2. **[프로필, 탭, 홈 화면을 테마 설정으로 커스터마이징하기]({{ site.baseurl }}/customizing-profile-navigation-and-home/)** — 설정 파일로 내 블로그로 만들기
3. **[글, 시리즈, 태그, 썸네일을 이 테마에서 다루는 방법]({{ site.baseurl }}/writing-posts-series-and-thumbnails/)** — 첫 번째 포스트 작성하기
4. **[GitHub Pages와 Jenkins로 테마를 배포하는 방법]({{ site.baseurl }}/deploying-with-github-pages-and-jenkins/)** — 실제 배포하기
5. **[GitHub 프로필 동기화와 기여 그래프를 붙이는 방법]({{ site.baseurl }}/github-profile-sync-and-contribution-graph/)** — GitHub 프로필 연결하기
