package main

import (
	"errors"
	"fmt"
	"runtime"
	"syscall"
	"unsafe"

	web "github.com/wailsapp/go-webview2/pkg/webview2"
	"github.com/wailsapp/go-webview2/webviewloader"
	"golang.org/x/sys/windows"
)

func (app *desktopWindow) EnvironmentCompleted(result webviewloader.HRESULT, env *webviewloader.ICoreWebView2Environment) webviewloader.HRESULT {
	if app.hwnd == 0 {
		return 0
	}
	if result < 0 || env == nil {
		app.failStartup(fmt.Errorf("WebView2 환경을 시작할 수 없습니다 (0x%08X).", uint32(result)))
		return 0
	}
	environment := (*web.ICoreWebView2Environment)(unsafe.Pointer(env))
	callback := &comCallbacks{window: app}
	handler := web.NewICoreWebView2CreateCoreWebView2ControllerCompletedHandler(callback)
	callback.setInterface(unsafe.Pointer(handler), "{6C4819F3-C9B7-4260-8127-C9F5BDE7F68C}")
	app.handlers = append(app.handlers, handler)
	if err := environment.CreateCoreWebView2Controller(web.HWND(app.hwnd), handler); err != nil {
		app.failStartup(fmt.Errorf("WebView2 창을 열 수 없습니다 (%w).", err))
	}
	return 0
}

type comCallbacks struct {
	window *desktopWindow
	object unsafe.Pointer
	guid   windows.GUID
}

var unknownGUID = windows.GUID{Data4: [8]byte{0xC0, 0, 0, 0, 0, 0, 0, 0x46}}

func (callback *comCallbacks) setInterface(object unsafe.Pointer, guid string) {
	callback.object = object
	callback.guid, _ = windows.GUIDFromString(guid)
}

func (callback *comCallbacks) QueryInterface(iid, output uintptr) uintptr {
	if iid == 0 || output == 0 {
		return 0x80004003 // E_POINTER
	}
	requested := *(*windows.GUID)(unsafe.Pointer(iid))
	result := (*unsafe.Pointer)(unsafe.Pointer(output))
	*result = nil
	if requested != unknownGUID && requested != callback.guid {
		return eNoInterface
	}
	*result = callback.object
	return 0
}

// The host holds references to every handler until the controller closes.
func (*comCallbacks) AddRef() uintptr  { return 1 }
func (*comCallbacks) Release() uintptr { return 1 }

func (callback *comCallbacks) CreateCoreWebView2ControllerCompleted(result uintptr, controller *web.ICoreWebView2Controller) uintptr {
	app := callback.window
	if app.hwnd == 0 {
		if controller != nil {
			_ = controller.Close()
		}
		return 0
	}
	if int32(result) < 0 || controller == nil {
		app.failStartup(fmt.Errorf("WebView2 창을 열 수 없습니다 (0x%08X).", uint32(result)))
		return 0
	}
	controller.AddRef()
	app.controller = controller
	if err := app.configureView(); err != nil {
		app.failStartup(fmt.Errorf("WebView2를 설정할 수 없습니다 (%w).", err))
		return 0
	}
	app.resize()
	_ = controller.PutIsVisible(true)
	app.navigateHome()
	return 0
}

func (app *desktopWindow) configureView() error {
	view, err := app.controller.GetCoreWebView2()
	if err != nil {
		return err
	}
	app.view = view
	settings, err := view.GetSettings()
	if err != nil {
		return err
	}
	// These Win32 setters take a BOOL by value. Use the COM calls directly.
	for _, setter := range []web.ComProc{
		settings.Vtbl.PutIsWebMessageEnabled,
		settings.Vtbl.PutAreDevToolsEnabled,
		settings.Vtbl.PutAreHostObjectsAllowed,
		settings.Vtbl.PutAreDefaultContextMenusEnabled,
		settings.Vtbl.PutIsStatusBarEnabled,
	} {
		if err := setValue(setter, unsafe.Pointer(settings), 0); err != nil {
			return err
		}
	}
	if err := suppressAutofill(settings); err != nil {
		return err
	}

	start := &comCallbacks{window: app}
	startHandler := web.NewICoreWebView2NavigationStartingEventHandler(start)
	start.setInterface(unsafe.Pointer(startHandler), "{9ADBE429-F36D-432B-9DDC-F8881FBD76E3}")
	done := &comCallbacks{window: app}
	doneHandler := web.NewICoreWebView2NavigationCompletedEventHandler(done)
	done.setInterface(unsafe.Pointer(doneHandler), "{D33A35BF-1C49-4F98-93AB-006E0533FE1C}")
	popup := &comCallbacks{window: app}
	popupHandler := web.NewICoreWebView2NewWindowRequestedEventHandler(popup)
	popup.setInterface(unsafe.Pointer(popupHandler), "{D4C185FE-C81C-4989-97AF-2D3FA7AB5651}")
	permissions := &comCallbacks{window: app}
	permissionHandler := web.NewICoreWebView2PermissionRequestedEventHandler(permissions)
	permissions.setInterface(unsafe.Pointer(permissionHandler), "{15E1C6A3-C72A-4DF3-91D9-D097FBEC6BFD}")
	app.handlers = append(app.handlers, startHandler, doneHandler, popupHandler, permissionHandler)
	if _, err := view.AddNavigationStarting(startHandler); err != nil {
		return err
	}
	if _, err := view.AddNavigationCompleted(doneHandler); err != nil {
		return err
	}
	if _, err := view.AddNewWindowRequested(popupHandler); err != nil {
		return err
	}
	if _, err := view.AddPermissionRequested(permissionHandler); err != nil {
		return err
	}
	return nil
}

func suppressAutofill(settings *web.ICoreWebView2Settings) error {
	guid, err := windows.GUIDFromString("{CB56846C-4168-4D53-B04F-03B6D6796FF2}")
	if err != nil {
		return err
	}
	var settings4 *web.ICoreWebView2Settings4
	result, _, _ := settings.Vtbl.QueryInterface.Call(
		uintptr(unsafe.Pointer(settings)), uintptr(unsafe.Pointer(&guid)), uintptr(unsafe.Pointer(&settings4)),
	)
	runtime.KeepAlive(settings)
	if int32(result) < 0 || settings4 == nil {
		return errors.New("최신 WebView2 Runtime으로 업데이트하세요.")
	}
	defer settings4.Vtbl.Release.Call(uintptr(unsafe.Pointer(settings4)))
	if err := setValue(settings4.Vtbl.PutIsPasswordAutosaveEnabled, unsafe.Pointer(settings4), 0); err != nil {
		return err
	}
	return setValue(settings4.Vtbl.PutIsGeneralAutofillEnabled, unsafe.Pointer(settings4), 0)
}

func setValue(setter web.ComProc, object unsafe.Pointer, value uintptr) error {
	result, _, _ := setter.Call(uintptr(object), value)
	runtime.KeepAlive(object)
	if int32(result) < 0 {
		return syscall.Errno(result)
	}
	return nil
}

func (callback *comCallbacks) NavigationStarting(_ *web.ICoreWebView2, args *web.ICoreWebView2NavigationStartingEventArgs) uintptr {
	if uri, err := args.GetUri(); err != nil || !isPortalURL(uri) {
		_ = setValue(args.Vtbl.PutCancel, unsafe.Pointer(args), 1)
		return 0
	}
	if id, err := args.GetNavigationId(); err == nil {
		callback.window.lastNavID = id
	}
	return 0
}

func (callback *comCallbacks) NavigationCompleted(_ *web.ICoreWebView2, args *web.ICoreWebView2NavigationCompletedEventArgs) uintptr {
	success, successErr := args.GetIsSuccess()
	if successErr == nil && !success {
		status, _ := args.GetWebErrorStatus()
		if status != web.COREWEBVIEW2_WEB_ERROR_STATUS_OPERATION_CANCELED {
			id, err := args.GetNavigationId()
			if err == nil && id == callback.window.lastNavID {
				postMessage.Call(callback.window.hwnd, wmConnectionError, uintptr(id), 0)
			}
		}
	}
	return 0
}

func (*comCallbacks) NewWindowRequested(_ *web.ICoreWebView2, args *web.ICoreWebView2NewWindowRequestedEventArgs) uintptr {
	_ = setValue(args.Vtbl.PutHandled, unsafe.Pointer(args), 1)
	return 0
}

func (*comCallbacks) PermissionRequested(_ *web.ICoreWebView2, args *web.ICoreWebView2PermissionRequestedEventArgs) uintptr {
	_ = setValue(args.Vtbl.PutState, unsafe.Pointer(args), web.COREWEBVIEW2_PERMISSION_STATE_DENY)
	return 0
}
