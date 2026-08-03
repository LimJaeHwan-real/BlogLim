# BlogLim Secure Publisher Worker

글쓰기 페이지의 글과 이미지를 `BlogLim/main`에 하나의 커밋으로 게시하는 Cloudflare Worker입니다. GitHub 토큰과 Client Secret은 브라우저나 Git 저장소에 저장하지 않습니다.

## 1. 최초 Worker 주소 만들기

```powershell
cd publisher-worker
npm install
npx wrangler login
npx wrangler deploy
```

첫 배포는 GitHub App 설정 전이므로 인증 API가 `CONFIGURATION_ERROR`를 반환하는 것이 정상입니다. 출력된 `https://bloglim-secure-publisher.<계정>.workers.dev` 주소를 기록합니다.

## 2. GitHub App 만들기

GitHub `Settings → Developer settings → GitHub Apps → New GitHub App`에서 다음과 같이 설정합니다.

- GitHub App name: `BlogLim Publisher`처럼 계정 안에서 고유한 이름
- Homepage URL: `https://limjaehwan-real.github.io/BlogLim/write/`
- Callback URL: `<Worker 주소>/auth/callback`
- Webhook: 비활성화
- Repository permissions → Contents: `Read and write`
- 나머지 Repository, Organization, Account 권한: `No access`
- User-to-server token expiration: 활성화 유지
- 설치 범위: `Only select repositories → BlogLim`

App을 만든 뒤 표시되는 Client ID를 `wrangler.toml`의 `GITHUB_CLIENT_ID`에 입력합니다. Client Secret은 파일에 쓰지 말고 아래 명령의 비공개 입력창에 직접 입력합니다.

```powershell
npx wrangler secret put GITHUB_CLIENT_SECRET
```

세션 암호화 키는 32자 이상의 무작위 값이어야 합니다. 다음 명령은 값을 화면이나 파일에 출력하지 않고 Worker Secret으로 전달합니다.

```powershell
$bytes = [byte[]]::new(48)
[Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
[Convert]::ToBase64String($bytes) | npx wrangler secret put SESSION_ENCRYPTION_KEY
```

비밀값 존재 여부만 확인하고 실제 값은 출력하지 않습니다.

```powershell
npx wrangler secret list
```

## 3. 운영 주소 연결

GitHub App 설정과 Secret 등록 후 Worker를 다시 배포합니다.

```powershell
npx wrangler deploy
```

루트 `_config.yml`에서 다음 공개 주소만 설정합니다.

```yml
publisher:
  api_url: "https://bloglim-secure-publisher.<계정>.workers.dev"
```

이 변경이 `main`에 반영되면 `/write/`의 `GitHub에 게시` 버튼이 활성화됩니다.

## 4. 검증

```powershell
npm run check
npm test
```

운영 확인 순서:

1. `/write/`에서 제목과 작은 테스트 이미지를 작성합니다.
2. 게시 확인창의 `_posts` 경로와 공개 주소를 확인합니다.
3. GitHub 인증 화면에서 `LimJaeHwan-real` 계정으로 로그인합니다.
4. 하나의 커밋에 글과 이미지가 모두 포함됐는지 확인합니다.
5. 커밋 작성자와 `main` 반영, GitHub Actions 성공, 공개 URL을 확인합니다.
6. 브라우저의 Local Storage, Session Storage, Network에 원본 `ghu_` 토큰이 없는지 확인합니다. Session Storage에는 `v1.`으로 시작하는 30분짜리 암호화 세션만 있어야 합니다.

## 운영 주의사항

- `wrangler.toml`, `_config.yml`, JavaScript에 토큰이나 Client Secret을 넣지 않습니다.
- GitHub App을 다른 저장소에 추가로 설치하지 않습니다.
- Worker 로그에 요청 본문, Authorization 헤더, GitHub 응답 본문을 기록하지 않습니다.
- 게시 경로 충돌은 기존 글을 덮어쓰지 않고 거절하는 것이 정상입니다.
- 실제 페이지 반영은 기존 GitHub Actions 배포가 끝난 뒤 완료됩니다.
