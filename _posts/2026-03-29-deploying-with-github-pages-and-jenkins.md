---
title: "GitHub Pages와 Jenkins로 테마를 배포하는 방법"
description: "프로젝트 페이지 기준으로 빌드 결과를 gh-pages 브랜치에 배포하는 흐름과 저장소 이름 변경 시 주의할 점까지 정리합니다."
date: 2026-03-29 09:00:00 +0900
updated_at: 2026-04-09 10:00:00 +0900
thumbnail: /assets/images/posts/deployment-guide-cover.png
series: theme-operations
tags:
  - GitHub Pages
  - Jenkins
  - Deployment
  - Open Source
---

이 테마는 `main` 브랜치에 push하면 GitHub Actions가 자동으로 빌드하고, 결과를 `gh-pages` 브랜치로 배포하는 구조입니다. 별도 서버 설정 없이 GitHub 저장소 설정 몇 가지만 바꾸면 됩니다.

## 배포 흐름 한눈에 보기

```text
내가 main에 push
    ↓
GitHub Actions 자동 실행
    ↓
1. gem 설치 (bundle install)
2. GitHub 프로필/기여 그래프 캐시 생성
3. jekyll build (_site/ 폴더 생성)
    ↓
_site/ 내용을 gh-pages 브랜치에 자동 push
    ↓
GitHub Pages가 gh-pages 브랜치를 서빙
    ↓
https://username.github.io/my-blog/ 접속 가능
```

## 1단계 — GitHub Pages 설정하기

이게 없으면 빌드가 성공해도 사이트가 열리지 않습니다.

1. fork한 저장소의 **Settings** 탭 클릭
2. 왼쪽 메뉴에서 **Pages** 클릭
3. **Source** 드롭다운에서 `Deploy from a branch` 선택
4. **Branch** 드롭다운에서 `gh-pages` 선택, 폴더는 `/ (root)` 선택
5. **Save** 클릭

> **`gh-pages` 브랜치가 목록에 없을 때:**  
> `main`에 push를 한 번 하면 GitHub Actions가 자동으로 `gh-pages` 브랜치를 만듭니다.  
> 저장소의 **Actions** 탭에서 빌드 완료 후 다시 시도해보세요.

## 2단계 — `_config.yml` URL 설정 확인

배포 주소와 `_config.yml` 설정이 반드시 일치해야 합니다.

### 경우 1: 프로젝트 페이지 (가장 일반적)

저장소 이름이 `my-blog`이고, GitHub 아이디가 `hong`이면:

```yml
url: "https://hong.github.io"
baseurl: "/my-blog"
```

접속 주소: `https://hong.github.io/my-blog/`

### 경우 2: 사용자 페이지 (저장소 이름이 `username.github.io`)

```yml
url: "https://hong.github.io"
baseurl: ""
```

접속 주소: `https://hong.github.io/`

### 경우 3: 커스텀 도메인 사용

```yml
url: "https://blog.mydomain.com"
baseurl: ""
```

> **가장 흔한 실수:** `baseurl`을 잘못 설정하면 CSS와 이미지가 404가 납니다.  
> 배포 후 화면이 깨지면 가장 먼저 `baseurl`을 확인하세요.

## 3단계 — 배포 확인

저장소 **Actions** 탭에서 빌드 진행 상황을 확인할 수 있습니다.

- 노란 원 🟡 = 빌드 진행 중
- 초록 체크 ✅ = 빌드 성공, 사이트 열림
- 빨간 X ❌ = 빌드 실패, 로그 확인 필요

빌드 성공 후 1~2분 내에 사이트가 열립니다.

## 커스텀 도메인 연결하기 (선택)

기본 `github.io` 주소 대신 본인 도메인을 연결할 수 있습니다.

### 1. GitHub Pages에 도메인 입력

**Settings → Pages → Custom domain**에 도메인 입력 후 Save.

### 2. DNS 설정

도메인 등록 업체(가비아, Cloudflare 등)에서 DNS 레코드를 추가합니다.

**루트 도메인** (`example.com`):

```text
A 레코드 → 185.199.108.153
A 레코드 → 185.199.109.153
A 레코드 → 185.199.110.153
A 레코드 → 185.199.111.153
```

**서브도메인** (`blog.example.com`):

```text
CNAME 레코드 → username.github.io
```

### 3. HTTPS 활성화

DNS 설정 후 GitHub Pages가 TLS 인증서를 발급합니다(보통 수 분~수십 분 소요).  
**Settings → Pages**에서 `Enforce HTTPS` 버튼이 활성화되면 클릭해서 켜세요.

> 인증서가 오래 걸릴 때는 Custom domain을 한 번 제거 후 다시 입력하면 재시도됩니다.

## 자동 배포가 안 될 때 확인할 것

### GitHub Actions 권한 오류

```text
Error: Permission denied to github-actions[bot]
```

**Settings → Actions → General → Workflow permissions**에서  
`Read and write permissions`를 선택하고 저장하세요.

---

### 빌드는 성공했는데 사이트가 안 열릴 때

1. **Settings → Pages**에서 source가 `gh-pages / (root)`로 설정됐는지 확인
2. `gh-pages` 브랜치에 실제 파일이 있는지 확인
3. `_config.yml`의 `url`과 `baseurl`이 올바른지 확인

---

### 빌드 실패 시

Actions 탭에서 실패한 job을 클릭하면 상세 로그를 볼 수 있습니다. 가장 흔한 원인은 `Gemfile.lock` 충돌 또는 잘못된 YAML 문법입니다.

## Jenkins로 배포하기

GitHub Actions 대신 Jenkins를 쓰는 환경이라면 저장소에 포함된 `Jenkinsfile`을 그대로 사용할 수 있습니다.

### 필요한 Credentials

Jenkins에 아래 자격증명을 등록합니다.

```text
Kind: Username with password
ID: github-pages
Username: GitHub 사용자명
Password: GitHub Personal Access Token (repo 권한)
```

### Jenkins 에이전트 요구사항

```text
- Ruby 3.2.x
- Bundler
- Git
```

### 배포 흐름

Jenkinsfile의 파이프라인은 GitHub Actions와 동일한 흐름입니다.

1. gem 설치
2. GitHub 프로필/기여 그래프 캐시 갱신
3. `jekyll build`
4. `gh-pages` 브랜치에 push

## 배포 후 체크리스트

- [ ] 사이트 주소로 접속 시 200 응답 확인
- [ ] 홈, 시리즈, 글 상세 페이지 정상 표시 확인
- [ ] CSS와 이미지가 깨지지 않는지 확인
- [ ] `feed.xml` 접속 확인 (`/feed.xml`)
- [ ] 커스텀 도메인 사용 시 HTTPS 작동 확인

## 다음 단계

배포가 완료됐다면 GitHub 프로필과 기여 그래프를 블로그에 연결해보세요.

→ **[GitHub 프로필 동기화와 기여 그래프를 붙이는 방법]({{ site.baseurl }}/github-profile-sync-and-contribution-graph/)**
