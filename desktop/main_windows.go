package main

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"syscall"
	"unsafe"

	web "github.com/wailsapp/go-webview2/pkg/webview2"
	"github.com/wailsapp/go-webview2/webviewloader"
	"golang.org/x/sys/windows"
)

const (
	title                = "급여 지급 관리"
	wmDestroy            = 0x0002
	wmMove               = 0x0003
	wmSize               = 0x0005
	wmClose              = 0x0010
	wmCommand            = 0x0111
	wmConnectionError    = 0x8001
	wmStartupError       = 0x8002
	commandHome          = 101
	commandReload        = 102
	commandExit          = 103
	menuString           = 0
	menuPopup            = 0x0010
	menuSeparator        = 0x0800
	windowStyle          = 0x02CF0000 // Resizable top-level window with clipped child area.
	useDefaultPosition   = 0x80000000
	systemWindowColor    = 6
	standardArrow        = 32512
	standardAppIcon      = 32512
	showNormal           = 1
	mbRetryCancel        = 0x00000005
	mbIconError          = 0x00000010
	mbIconWarning        = 0x00000030
	idRetry              = 4
	comApartmentThreaded = 2
	eNoInterface         = 0x80004002
)

var (
	user32          = windows.NewLazySystemDLL("user32.dll")
	registerClass   = user32.NewProc("RegisterClassExW")
	createWindow    = user32.NewProc("CreateWindowExW")
	defaultProc     = user32.NewProc("DefWindowProcW")
	destroyWindow   = user32.NewProc("DestroyWindow")
	showWindow      = user32.NewProc("ShowWindow")
	getClientRect   = user32.NewProc("GetClientRect")
	postQuitMessage = user32.NewProc("PostQuitMessage")
	postMessage     = user32.NewProc("PostMessageW")
	getMessage      = user32.NewProc("GetMessageW")
	translate       = user32.NewProc("TranslateMessage")
	dispatch        = user32.NewProc("DispatchMessageW")
	messageBox      = user32.NewProc("MessageBoxW")
	createMenu      = user32.NewProc("CreateMenu")
	createPopup     = user32.NewProc("CreatePopupMenu")
	appendMenu      = user32.NewProc("AppendMenuW")
	destroyMenu     = user32.NewProc("DestroyMenu")
	loadCursor      = user32.NewProc("LoadCursorW")
	loadIcon        = user32.NewProc("LoadIconW")
	setDPI          = user32.NewProc("SetProcessDpiAwarenessContext")
	current         desktopWindow
)

type windowClass struct {
	size, style                   uint32
	windowProc                    uintptr
	classExtra, windowExtra       int32
	instance, icon, cursor, brush uintptr
	menuName, className           *uint16
	smallIcon                     uintptr
}

type message struct {
	window  uintptr
	number  uint32
	wParam  uintptr
	lParam  uintptr
	time    uint32
	x, y    int32
	private uint32
}

type desktopWindow struct {
	hwnd         uintptr
	controller   *web.ICoreWebView2Controller
	view         *web.ICoreWebView2
	handlers     []any
	startupError error
	lastNavID    uint64
	promptOpen   bool
}

func main() {
	runtime.LockOSThread()
	if err := run(); err != nil {
		showDialog(0, "프로그램을 시작할 수 없습니다.\n\n"+err.Error(), mbIconError)
		os.Exit(1)
	}
}

func run() error {
	if err := windows.CoInitializeEx(0, comApartmentThreaded); err != nil && !errors.Is(err, syscall.Errno(1)) {
		return fmt.Errorf("Windows 구성 요소를 초기화할 수 없습니다 (%w).", err)
	}
	defer windows.CoUninitialize()
	if setDPI.Find() == nil {
		setDPI.Call(^uintptr(3)) // DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2
	}

	version, err := webviewloader.GetAvailableCoreWebView2BrowserVersionString("")
	if err != nil || version == "" {
		return errors.New("Microsoft Edge WebView2 Runtime이 필요합니다. Microsoft 공식 WebView2 다운로드에서 Evergreen Runtime을 설치한 뒤 다시 실행하세요.")
	}
	profile, err := windows.KnownFolderPath(windows.FOLDERID_LocalAppData, 0)
	if err != nil {
		return fmt.Errorf("현재 Windows 사용자의 데이터 폴더를 확인할 수 없습니다 (%w).", err)
	}
	profile = filepath.Join(profile, "PayrollAdmin", "WebView2")
	if err := os.MkdirAll(profile, 0700); err != nil {
		return fmt.Errorf("앱 데이터 폴더를 만들 수 없습니다 (%w).", err)
	}

	if err := current.open(); err != nil {
		return err
	}
	err = webviewloader.CreateCoreWebView2EnvironmentWithOptions(&current, webviewloader.WithUserDataFolder(profile))
	if err != nil {
		destroyWindow.Call(current.hwnd)
		return fmt.Errorf("WebView2를 시작할 수 없습니다 (%w).", err)
	}
	for {
		var msg message
		result, _, err := getMessage.Call(uintptr(unsafe.Pointer(&msg)), 0, 0, 0)
		switch int32(result) {
		case -1:
			return fmt.Errorf("Windows 이벤트를 처리할 수 없습니다 (%w).", err)
		case 0:
			return current.startupError
		default:
			translate.Call(uintptr(unsafe.Pointer(&msg)))
			dispatch.Call(uintptr(unsafe.Pointer(&msg)))
		}
	}
}

func (app *desktopWindow) open() error {
	var instance windows.Handle
	if err := windows.GetModuleHandleEx(windows.GET_MODULE_HANDLE_EX_FLAG_UNCHANGED_REFCOUNT, nil, &instance); err != nil {
		return fmt.Errorf("프로그램 모듈을 확인할 수 없습니다 (%w).", err)
	}
	className := utf16("PayrollAdminDesktopWindow")
	cursor, _, _ := loadCursor.Call(0, standardArrow)
	icon, _, _ := loadIcon.Call(0, standardAppIcon)
	class := windowClass{
		windowProc: windows.NewCallback(windowProc), instance: uintptr(instance),
		cursor: cursor, icon: icon, smallIcon: icon, brush: systemWindowColor, className: className,
	}
	class.size = uint32(unsafe.Sizeof(class))
	if result, _, err := registerClass.Call(uintptr(unsafe.Pointer(&class))); result == 0 {
		return fmt.Errorf("업무 창을 등록할 수 없습니다 (%w).", err)
	}
	menu, err := applicationMenu()
	if err != nil {
		return err
	}
	caption := utf16(title)
	hwnd, _, err := createWindow.Call(0, uintptr(unsafe.Pointer(className)), uintptr(unsafe.Pointer(caption)),
		windowStyle, useDefaultPosition, useDefaultPosition, 1240, 870, 0, menu, uintptr(instance), 0)
	runtime.KeepAlive(className)
	runtime.KeepAlive(caption)
	if hwnd == 0 {
		destroyMenu.Call(menu)
		return fmt.Errorf("업무 창을 열 수 없습니다 (%w).", err)
	}
	app.hwnd = hwnd
	showWindow.Call(hwnd, showNormal)
	return nil
}

func applicationMenu() (uintptr, error) {
	menu, _, menuErr := createMenu.Call()
	if menu == 0 {
		return 0, fmt.Errorf("업무 메뉴를 열 수 없습니다 (%w).", menuErr)
	}
	popup, _, popupErr := createPopup.Call()
	if popup == 0 {
		destroyMenu.Call(menu)
		return 0, fmt.Errorf("업무 메뉴를 열 수 없습니다 (%w).", popupErr)
	}
	entries := []struct {
		flags uintptr
		id    uintptr
		name  string
	}{
		{menuString, commandHome, "홈으로 이동"},
		{menuString, commandReload, "새로 고침"},
		{menuSeparator, 0, ""},
		{menuString, commandExit, "종료"},
	}
	for _, item := range entries {
		label := utf16(item.name)
		result, _, err := appendMenu.Call(popup, item.flags, item.id, uintptr(unsafe.Pointer(label)))
		runtime.KeepAlive(label)
		if result == 0 {
			destroyMenu.Call(popup)
			destroyMenu.Call(menu)
			return 0, fmt.Errorf("업무 메뉴를 구성할 수 없습니다 (%w).", err)
		}
	}
	label := utf16("업무")
	result, _, err := appendMenu.Call(menu, menuPopup, popup, uintptr(unsafe.Pointer(label)))
	runtime.KeepAlive(label)
	if result == 0 {
		destroyMenu.Call(popup)
		destroyMenu.Call(menu)
		return 0, fmt.Errorf("업무 메뉴를 구성할 수 없습니다 (%w).", err)
	}
	return menu, nil
}

func windowProc(hwnd uintptr, event uint32, wParam, lParam uintptr) uintptr {
	switch event {
	case wmSize:
		current.resize()
	case wmMove:
		if current.controller != nil {
			_ = current.controller.NotifyParentWindowPositionChanged()
		}
	case wmCommand:
		switch uint16(wParam) {
		case commandHome:
			current.navigateHome()
		case commandReload:
			current.reload()
		case commandExit:
			destroyWindow.Call(hwnd)
		}
		return 0
	case wmClose:
		destroyWindow.Call(hwnd)
		return 0
	case wmDestroy:
		if current.controller != nil {
			_ = current.controller.Close()
			current.controller = nil
			current.view = nil
		}
		current.hwnd = 0
		postQuitMessage.Call(0)
		return 0
	case wmConnectionError:
		if !current.promptOpen && current.view != nil && uint64(wParam) == current.lastNavID {
			current.promptOpen = true
			result := showDialog(hwnd, "급여 지급 관리 서버에 연결할 수 없습니다.\n인터넷 연결을 확인한 뒤 다시 시도하세요.", mbRetryCancel|mbIconWarning)
			current.promptOpen = false
			if result == idRetry {
				current.navigateHome()
			}
		}
		return 0
	case wmStartupError:
		destroyWindow.Call(hwnd)
		return 0
	}
	result, _, _ := defaultProc.Call(hwnd, uintptr(event), wParam, lParam)
	return result
}

func (app *desktopWindow) resize() {
	if app.controller == nil || app.hwnd == 0 {
		return
	}
	var bounds web.RECT
	if result, _, _ := getClientRect.Call(app.hwnd, uintptr(unsafe.Pointer(&bounds))); result != 0 {
		_ = app.controller.PutBounds(bounds)
	}
}

func (app *desktopWindow) navigateHome() {
	if app.view != nil && app.view.Navigate(portalURL) != nil {
		postMessage.Call(app.hwnd, wmConnectionError, uintptr(app.lastNavID), 0)
	}
}

func (app *desktopWindow) reload() {
	if app.view == nil {
		return
	}
	source, err := app.view.GetSource()
	if err != nil || !isPortalURL(source) {
		app.navigateHome()
		return
	}
	if err := app.view.Reload(); err != nil {
		postMessage.Call(app.hwnd, wmConnectionError, uintptr(app.lastNavID), 0)
	}
}

func (app *desktopWindow) failStartup(err error) {
	app.startupError = err
	if app.hwnd != 0 {
		postMessage.Call(app.hwnd, wmStartupError, 0, 0)
	}
}

func utf16(value string) *uint16 {
	return windows.StringToUTF16Ptr(value)
}

func showDialog(hwnd uintptr, text string, style uintptr) uintptr {
	message, caption := utf16(text), utf16(title)
	result, _, _ := messageBox.Call(hwnd, uintptr(unsafe.Pointer(message)), uintptr(unsafe.Pointer(caption)), style)
	runtime.KeepAlive(message)
	runtime.KeepAlive(caption)
	return result
}
