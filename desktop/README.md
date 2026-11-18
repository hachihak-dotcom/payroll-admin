# 급여 지급 관리 Windows 앱

Windows 10/11 64비트(x64)에서 실행하는 설치 없는 프로그램입니다. `PayrollAdmin-Windows-x64.exe`를 실행하면 전용 업무 창이 열립니다. 운영 환경의 기존 계정과 PostgreSQL 데이터를 사용하므로 인터넷 연결이 필요합니다. 앱에는 데이터베이스 연결 문자열이나 관리자 설정 코드가 포함되지 않습니다.

[Microsoft Edge WebView2 Evergreen Runtime](https://developer.microsoft.com/microsoft-edge/webview2/#download-section)이 설치되어 있어야 합니다. 로그인 정보는 앱의 Windows 사용자별 프로필에 저장되는 세션 쿠키로 유지되며, 비밀번호 저장과 자동 입력은 끕니다. 업무 종료 시 앱의 로그아웃을 사용하세요.

**업무 → 새로 고침**에서 현재 화면을 다시 불러오거나 서버에 재접속할 수 있습니다. 업무 창은 정해진 운영 HTTPS 주소만 허용합니다. 인증서 검증에는 WebView2의 기본 정책을 사용합니다.

## 빌드

Go 1.24 이상을 사용합니다. Linux에서 Windows x64를 대상으로 교차 빌드할 수 있습니다.

```bash
go test ./...
CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -trimpath -ldflags="-H=windowsgui -s -w" -o PayrollAdmin-Windows-x64.exe .
```

배포 바이너리는 코드 서명 인증서 없이 빌드하므로 Windows 또는 기관 정책에 따라 보안 알림이 표시되거나 실행이 제한될 수 있습니다. 파일 해시는 GitHub 릴리스에서 제공합니다.
