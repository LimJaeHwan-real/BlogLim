---
title: "GitHub 프로필 동기화와 기여 그래프를 붙이는 방법"
description: "GitHub 아이디만 연결하면 이름, 아바타, 링크, 기여 그래프가 홈 화면에 반영되는 흐름과 fallback 규칙을 설명합니다."
date: 2026-03-28 09:00:00 +0900
updated_at: 2026-04-09 10:00:00 +0900
thumbnail: /assets/images/posts/github-sync-cover.png
series: theme-operations
tags:
  - GitHub
  - GraphQL
  - Profile Sync
  - Jekyll Theme
---

이 테마는 GitHub 계정을 연결하면 홈의 프로필 이름, 아바타, 기여 그래프를 자동으로 채웁니다. 연결이 실패하거나 설정을 안 해도 화면이 깨지지 않는 fallback 구조도 함께 갖고 있습니다.

## 어떤 데이터를 가져오나요?

동기화 스크립트는 두 종류의 캐시 파일을 만듭니다.

| 파일 | 내용 |
|---|---|
| `_data/github_profile_cache.json` | 이름, 아바타 URL, GitHub 링크, 소개 |
| `_data/github_contributions_cache.json` | 최근 1년간 날짜별 기여 횟수 |

빌드 시에는 이 캐시 파일만 읽기 때문에 **브라우저에 토큰이 노출되지 않습니다.**

## 설정 방법

### 1. `_data/theme.yml` 수정

```yml
hero:
  github_contributions:
    enabled: true          # 기여 그래프 활성화
    username: your-id      # 본인 GitHub 아이디 (예: hong)

profile:
  github_sync:
    enabled: true          # 프로필 동기화 활성화
```

`username`이 비어 있으면 `_data/profile.yml`의 `github` 링크에서 아이디를 유추합니다.

### 2. 인증 준비

아래 세 가지 중 하나면 됩니다.

**방법 A — GitHub CLI (가장 쉬움)**

```bash
gh auth login
```

프롬프트에 따라 브라우저에서 GitHub 로그인하면 자동으로 인증됩니다.

**방법 B — Personal Access Token**

1. GitHub → **Settings → Developer settings → Personal access tokens → Fine-grained tokens**
2. **Generate new token** 클릭
3. Repository access: `Public Repositories (read-only)`
4. Permissions에서 `read:user` 선택
5. 토큰 생성 후 복사

```bash
export GITHUB_TOKEN=ghp_xxxxxxxxxxxx
```

> 토큰은 한 번만 보여줍니다. 반드시 복사해두세요.

### 3. 동기화 스크립트 실행

```bash
ruby scripts/fetch_github_contributions.rb
```

성공하면 아래처럼 출력됩니다.

```text
Fetching GitHub profile for: your-id
✓ Profile saved to _data/github_profile_cache.json
✓ Contributions saved to _data/github_contributions_cache.json
```

### 4. 결과 확인

로컬에서 확인:

```bash
BUNDLE_FORCE_RUBY_PLATFORM=true bundle exec jekyll serve
```

홈 화면에 본인 GitHub 아바타, 이름, 기여 그래프가 표시되면 성공입니다.

## 배포 환경에서 자동 동기화

로컬에서 수동으로 실행하는 방법 외에, GitHub Actions로 배포할 때 자동으로 동기화됩니다.

### 1. Repository Secret 등록

저장소 **Settings → Secrets and variables → Actions → New repository secret**

```text
Name: GH_PAT
Secret: (위에서 만든 Personal Access Token 값)
```

### 2. 자동 동기화 스케줄 확인

이 저장소의 `.github/workflows/deploy.yml`에는 두 가지 트리거가 있습니다.

- `main` 브랜치 push 시 → 배포와 함께 프로필 동기화
- **매일 새벽 3시 17분** → 기여 그래프 자동 갱신

즉, 새 글을 push할 때마다 기여 그래프도 최신으로 업데이트됩니다.

## fallback 규칙

연결이 완벽하지 않아도 화면이 망가지지 않습니다.

| 상황 | 화면 동작 |
|---|---|
| GitHub 아바타 있음 | GitHub 아바타 사용 |
| GitHub 아바타 없음 | `_data/profile.yml`의 `avatar` 사용 |
| GitHub 이름 있음 | GitHub 이름으로 표시 |
| GitHub `bio` 비어 있음 | `_data/profile.yml`의 소개 유지 |
| 기여 그래프 캐시 없음 | 마지막 캐시 또는 빈 그래프 표시 |

즉, 처음 fork했을 때는 `_data/profile.yml`의 샘플 데이터가 보이고, GitHub 연동을 완료하면 자동으로 실제 데이터로 교체됩니다.

## 동기화가 안 될 때 확인할 것

### 스크립트 실행 후 파일이 생성됐는지 확인

```bash
ls _data/github_*_cache.json
```

파일이 없다면 인증이 실패한 것입니다.

---

### 인증 오류가 날 때

```text
Error: Could not authenticate with GitHub API
```

- `GITHUB_TOKEN` 환경 변수가 설정됐는지 확인
- `gh auth status`로 GitHub CLI 로그인 상태 확인
- 토큰이 만료됐거나 권한이 부족하지 않은지 확인

---

### 프로필은 동기화됐는데 기여 그래프가 안 보일 때

`_data/theme.yml`에서 `hero.github_contributions.enabled`가 `true`인지,  
`username`이 실제 GitHub 아이디와 일치하는지 확인하세요.

---

### GitHub Actions에서 동기화 실패할 때

저장소 **Settings → Secrets and variables → Actions**에서 `GH_PAT` 시크릿이 등록됐는지 확인하세요. 없으면 Actions가 GitHub API에 접근할 수 없습니다.

## GitHub 연동 없이 프로필만 꾸미기

GitHub 동기화를 쓰지 않더라도 `_data/profile.yml`을 직접 편집하면 됩니다.

```yml
display_name: 홍길동
bio: 백엔드 개발자, 기록을 좋아합니다
intro: Python, Django, PostgreSQL 주로 사용
avatar: /assets/images/my-avatar.jpg   # 직접 이미지 업로드
github: https://github.com/your-handle
```

`avatar`에 외부 URL(예: GitHub 프로필 이미지 URL)을 직접 넣어도 됩니다.

```yml
avatar: https://avatars.githubusercontent.com/u/12345678
```

## 정리

이 테마의 GitHub 연동 구조를 한 줄로 정리하면:

> **연결되면 자동으로 좋아지고, 연결이 안 돼도 깨지지 않는다.**

처음에는 `_data/profile.yml`로 빠르게 채우고, 나중에 여유가 생기면 GitHub 동기화를 붙이는 방식으로도 충분합니다.
