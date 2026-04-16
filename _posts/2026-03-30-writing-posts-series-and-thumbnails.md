---
title: "글, 시리즈, 태그, 썸네일을 이 테마에서 다루는 방법"
description: "front matter 설계, Markdown 지원 범위, 시리즈와 태그 연결, 썸네일 표시 규칙까지 작성자 관점에서 정리합니다."
date: 2026-03-30 09:00:00 +0900
updated_at: 2026-04-09 10:00:00 +0900
thumbnail: /assets/images/posts/writing-guide-cover.png
series: theme-overview
tags:
  - Markdown
  - Series
  - Tags
  - Thumbnail
---

이 테마에서 글을 작성하는 방법은 단순합니다. `_posts/` 폴더에 마크다운 파일을 만들면 끝입니다. 다만 파일명 규칙과 front matter 몇 가지를 지키면 글 목록, 시리즈, 태그가 자동으로 연결됩니다.

## 파일 만들기

### 파일명 규칙

```text
YYYY-MM-DD-영문-슬러그.md
```

예시:

```text
2026-04-09-my-first-post.md
2026-04-10-django-rest-framework-tutorial.md
```

> **주의:** `date`가 오늘 이후 날짜이면 빌드 시 글이 보이지 않을 수 있습니다.  
> 반드시 현재 날짜 이전으로 설정하세요.

### 저장 위치

```text
jekyll-theme-velog/
└── _posts/
    ├── 2026-04-09-my-first-post.md   ← 여기에 저장
    └── ...
```

GitHub 웹에서 바로 작성하려면:

1. 저장소에서 `_posts` 폴더 클릭
2. **Add file → Create new file** 클릭
3. 파일명 입력 후 내용 작성
4. **Commit changes** 클릭

## front matter 전체 예시

```md
---
title: 글 제목을 여기에 씁니다
description: 글 목록 카드에 보일 한 줄 요약입니다
date: 2026-04-09 09:00:00 +0900
updated_at: 2026-04-09 21:00:00 +0900
thumbnail: /assets/images/posts/my-cover.png
series: my-series
tags:
  - Python
  - Django
  - Tutorial
---

여기서부터 본문을 마크다운으로 씁니다.
```

## 각 필드 설명

| 필드 | 필수 | 화면에서 쓰이는 곳 |
|---|---|---|
| `title` | ✅ | 글 목록 제목, 상세 제목, 브라우저 탭 |
| `description` | 권장 | 글 목록 카드 요약 문구 |
| `date` | ✅ | 날짜 정렬, 발행일 표시 |
| `updated_at` | 선택 | 수정일 표시 |
| `thumbnail` | 선택 | 글 카드 이미지, 상세 상단 이미지 |
| `series` | 선택 | 시리즈 카드 그룹화, 시리즈 필터 |
| `tags` | 선택 | 홈 태그 패널, 글 상세 태그 링크 |

## 시리즈 연결하기

### 1. `_data/series.yml`에 시리즈 등록

```yml
django-study:
  title: Django 공부 기록
  description: Django 기초부터 배포까지 학습하면서 기록합니다
```

### 2. 포스트 front matter에 키 입력

```yml
series: django-study
```

이렇게 하면 같은 `series` 키를 가진 글들이 시리즈 탭에 카드로 묶입니다. 시리즈 카드에는 `series.yml`에서 가져온 제목과 설명이 표시됩니다.

**장점:** 시리즈 이름을 바꾸고 싶으면 `series.yml` 한 곳만 수정하면 됩니다. 각 포스트를 하나씩 바꿀 필요가 없습니다.

## 태그 사용 팁

태그는 두 군데에서 동시에 쓰입니다.

- 홈 좌측 **태그 패널** — 클릭하면 해당 태그의 글만 필터링
- **글 카드와 상세** 하단 태그 링크

태그는 탐색 체계입니다. 너무 세분화하면 목록이 지저분해지고, 너무 넓으면 필터 효과가 없습니다. 글 5~10개당 태그 10개 이하를 권장합니다.

## 썸네일 규칙

썸네일은 `thumbnail` 필드가 있을 때만 표시됩니다. 없으면 텍스트 중심 카드로 자연스럽게 표시됩니다.

```yml
# 로컬 이미지 사용
thumbnail: /assets/images/posts/my-cover.png

# 외부 이미지 사용
thumbnail: https://example.com/image.png
```

이미지 파일은 `assets/images/posts/` 폴더에 넣으면 됩니다.

**권장 이미지 비율:** 가로형(16:9 또는 2:1)을 쓰면 카드와 상세 페이지 모두에서 자연스럽게 보입니다.

## Markdown 지원 범위

이 테마에서 지원이 확인된 Markdown 요소입니다.

```md
# 제목 1
## 제목 2
### 제목 3

일반 문단 텍스트

**굵게**, _기울여_, ~~취소선~~

- 목록 항목
  - 중첩 목록

1. 번호 목록

- [x] 체크리스트 완료
- [ ] 체크리스트 미완료

| 헤더1 | 헤더2 |
|---|---|
| 값1  | 값2  |

> 인용문

`인라인 코드`

```python
# 코드 블록 (언어 지정 가능)
def hello():
    print("Hello!")
```

![이미지 설명](이미지 경로)

[링크 텍스트](URL)
```

YouTube 영상은 iframe으로 직접 삽입할 수 있습니다.

```html
<iframe width="560" height="315" src="https://www.youtube.com/embed/VIDEO_ID" frameborder="0" allowfullscreen></iframe>
```

## 글 발행 전 체크리스트

- [ ] `description`이 카드 요약으로 자연스러운지
- [ ] `date`가 현재 날짜 이전인지
- [ ] `series` 키가 `_data/series.yml`에 등록되어 있는지
- [ ] `thumbnail` 경로가 실제 파일과 일치하는지
- [ ] 태그가 너무 많지 않은지 (5개 이하 권장)

## 다음 단계

글 작성 방법을 알았다면, 이제 배포할 차례입니다.

→ **[GitHub Pages와 Jenkins로 테마를 배포하는 방법]({{ site.baseurl }}/deploying-with-github-pages-and-jenkins/)**
