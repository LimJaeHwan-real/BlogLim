# 0001. 안전한 GitHub 게시 경계

## Context

BlogLim은 GitHub Pages에서 실행되는 정적 사이트다. 글쓰기 페이지에서 `main`에 직접 게시하려면 GitHub 쓰기 권한이 필요하지만, 정적 JavaScript에 토큰이나 Client Secret을 넣으면 방문자가 값을 가져갈 수 있다. 글과 이미지가 여러 API 요청 중 일부만 반영되는 상황도 방지해야 한다.

## Options considered

1. Personal Access Token을 브라우저에 저장
   - 구현은 작지만 토큰 유출과 과도한 저장소 권한 위험 때문에 제외했다.
2. GitHub 편집 화면으로 이동
   - 별도 서버는 필요 없지만 글쓰기 페이지에서 바로 게시한다는 요구를 충족하지 못한다.
3. OAuth App과 범용 `repo` 권한
   - 동작하지만 GitHub App보다 저장소와 권한 범위를 세밀하게 제한하기 어렵다.
4. Cloudflare Worker와 저장소 한정 GitHub App
   - 비밀값을 서버에 격리하고 사용자 활동 귀속, 경로 검증, 원자적 커밋을 함께 제공할 수 있다.

## Decision

- GitHub App 사용자 액세스 토큰과 PKCE OAuth 흐름을 사용한다.
- App은 `BlogLim` 한 저장소에만 설치하고 `Contents: read/write`만 부여한다.
- 게시자는 `LimJaeHwan-real`로 고정한다.
- 원본 사용자 토큰은 브라우저에 전달하지 않는다. Worker가 AES-GCM으로 봉인한 30분 세션만 `sessionStorage`에 보관한다.
- OAuth state와 PKCE verifier도 HttpOnly, Secure, SameSite=Lax 쿠키에 암호화해 10분만 보관한다.
- 저장소, 브랜치, 글·이미지 경로는 Worker가 결정하며 요청값으로 변경할 수 없다.
- 글과 이미지 blob, tree, commit을 만든 후 `force: false`로 `main` 참조를 한 번 갱신한다.
- 기존 경로를 덮어쓰지 않고 동시 변경은 한 번만 재시도한다.
- SVG와 3MB 초과 이미지, 5개 초과 이미지, 고신뢰 비밀값 패턴은 거절한다.
- GitHub API 오류 본문과 인증 정보는 사용자 응답이나 로그에 포함하지 않는다.

## Rationale

이 방식은 GitHub Pages 구조를 유지하면서 비밀값과 쓰기 권한을 서버 경계 안에 둔다. 사용자 액세스 토큰을 사용하므로 게시 활동을 실제 사용자에게 귀속할 수 있고, GitHub App 설치 범위와 서버 측 경로 고정으로 피해 범위를 줄인다. 마지막 ref 갱신 전까지 생성된 Git 객체는 `main`에서 보이지 않으므로 부분 게시도 방지한다.

## Affected files

- `write.html`, `assets/js/publisher.js`, `assets/css/main.css`
- `_config.yml`
- `publisher-worker/`

## Follow-up review

- 첫 운영 게시 후 GitHub App 권한이 `Contents` 외에 추가되지 않았는지 재확인한다.
- 커밋 작성자, Actions 배포, 공개 URL과 브라우저 토큰 비노출을 확인한다.
- 협업자 게시나 기존 글 수정 기능이 필요해지면 별도 결정 기록을 작성한다.
