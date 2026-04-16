---
title: "로컬에서 테마를 설치하고 미리보기하는 가장 빠른 방법"
description: "Ruby 의존성 설치부터 GitHub 연동 데이터 동기화, 로컬 미리보기와 흔한 오류 대응까지 한 번에 정리합니다."
date: 2026-04-01 09:00:00 +0900
updated_at: 2026-04-09 10:00:00 +0900
thumbnail: /assets/images/posts/local-setup-cover.png
series: theme-setup
tags:
  - Quick Start
  - Local Preview
  - Ruby
  - Jekyll
---

> 글을 GitHub 웹에서 직접 작성할 계획이라면 이 글은 건너뛰어도 됩니다.  
> 테마를 수정하거나 배포 전 미리보기가 필요한 경우에만 로컬 실행이 필요합니다.

## 준비물

| 항목 | 필수 여부 | 설명 |
|---|---|---|
| Ruby 3.2.x | **필수** | Jekyll은 Ruby 기반입니다 |
| Bundler | **필수** | gem 의존성 관리 도구 |
| Git | **필수** | 저장소 복제용 |
| GitHub 토큰 | 선택 | 프로필/기여 그래프 동기화 시 필요 |

GitHub 연동 없이도 블로그는 정상 작동합니다. 프로필과 잔디 그래프만 샘플 상태를 유지합니다.

## Ruby 설치하기

이 저장소는 **Ruby 3.2.9** 기준으로 검증했습니다. `.ruby-version` 파일이 포함되어 있어서 버전 관리자를 쓰면 자동으로 맞춰집니다.

### macOS

```bash
# rbenv 설치 (Homebrew 필요)
brew install rbenv ruby-build

# 쉘에 rbenv 초기화 추가
echo 'eval "$(rbenv init -)"' >> ~/.zshrc
source ~/.zshrc

# Ruby 3.2.9 설치
rbenv install 3.2.9
rbenv global 3.2.9

# 버전 확인
ruby -v
```

### Windows

[RubyInstaller](https://rubyinstaller.org/)에서 **Ruby+Devkit 3.2.x** 버전을 받아 설치합니다.  
설치 마지막 단계에서 `MSYS2 development toolchain` 체크박스를 반드시 선택하세요.

### Linux (Ubuntu/Debian)

```bash
sudo apt-get install rbenv
rbenv install 3.2.9
rbenv global 3.2.9
```

## 저장소 복제 및 의존성 설치

```bash
# 저장소 복제 (본인 fork 주소로 변경)
git clone https://github.com/username/my-blog.git
cd my-blog

# gem 설치
BUNDLE_FORCE_RUBY_PLATFORM=true bundle install
```

> **`BUNDLE_FORCE_RUBY_PLATFORM=true`가 왜 필요한가요?**  
> Apple Silicon(M1/M2/M3) Mac 또는 일부 환경에서 네이티브 gem 설치 오류가 발생할 수 있습니다.  
> 이 옵션을 붙이면 Ruby 플랫폼용 gem을 강제로 사용해서 대부분의 오류를 피할 수 있습니다.

## 로컬 서버 실행

```bash
BUNDLE_FORCE_RUBY_PLATFORM=true bundle exec jekyll serve
```

브라우저에서 `http://127.0.0.1:4000/` 으로 접속하면 미리보기가 열립니다.

`baseurl`을 설정했다면 주소가 달라집니다.

```text
baseurl: ""           → http://127.0.0.1:4000/
baseurl: "/my-blog"   → http://127.0.0.1:4000/my-blog/
```

## GitHub 프로필과 기여 그래프 연동하기 (선택)

홈 화면에 본인 GitHub 프로필과 잔디 그래프를 표시하려면 아래 단계가 필요합니다.

### 1. GitHub 토큰 준비

아래 세 가지 방법 중 하나를 선택합니다.

**방법 A — GitHub CLI 로그인 (가장 간단)**

```bash
# GitHub CLI 설치 후
gh auth login
```

**방법 B — 환경 변수로 토큰 설정**

GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens에서 토큰을 생성합니다. 필요한 권한은 `read:user` 하나면 충분합니다.

```bash
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```

### 2. 동기화 스크립트 실행

```bash
ruby scripts/fetch_github_contributions.rb
```

성공하면 아래 두 파일이 생성됩니다.

```text
_data/github_profile_cache.json      프로필 정보
_data/github_contributions_cache.json  기여 그래프 데이터
```

### 3. `_data/theme.yml` 설정 확인

```yml
hero:
  github_contributions:
    enabled: true
    username: your-github-id   # 본인 GitHub 아이디로 변경

profile:
  github_sync:
    enabled: true
```

이후 `jekyll serve`를 재실행하면 홈에 GitHub 프로필이 표시됩니다.

## 자주 발생하는 오류와 해결 방법

### `bundle install` 실패

```text
오류: An error occurred while installing ffi
```

해결:

```bash
BUNDLE_FORCE_RUBY_PLATFORM=true bundle install
```

또는 Ruby 버전이 3.2.x인지 `ruby -v`로 먼저 확인하세요.

---

### 스타일이 깨지거나 이미지가 안 보일 때

`_config.yml`의 `baseurl`이 저장소 이름과 다를 가능성이 높습니다.

```yml
# 저장소 이름이 my-blog라면
baseurl: "/my-blog"

# 저장소 이름이 username.github.io라면
baseurl: ""
```

---

### 잔디 그래프가 비어 있을 때

GitHub 토큰이 없거나 `_data/theme.yml`의 `username`이 비어 있을 때 발생합니다.  
GitHub 연동을 아직 하지 않은 경우라면 `hero.github_contributions.enabled: false`로 잠시 꺼두면 됩니다.

---

### `jekyll serve` 후 파일을 수정해도 반영이 안 될 때

`_config.yml`을 수정했다면 서버를 재시작해야 합니다. 다른 파일은 저장과 동시에 자동으로 반영됩니다.

## 추천 로컬 워크플로

처음 테마를 가져간 뒤 아래 순서로 진행하면 가장 빠릅니다.

1. `bundle install`
2. `_config.yml`에서 `title`, `url`, `baseurl` 수정
3. `_data/profile.yml`에서 기본 이름과 소개 수정
4. `jekyll serve`로 로컬 미리보기
5. 만족스러우면 GitHub에 push → 자동 배포

## 다음 단계

로컬 미리보기가 준비됐다면, 다음은 설정 파일을 내 블로그에 맞게 바꿀 차례입니다.

→ **[프로필, 탭, 홈 화면을 테마 설정으로 커스터마이징하기]({{ site.baseurl }}/customizing-profile-navigation-and-home/)**
