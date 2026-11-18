package main

import "testing"

func TestIsPortalURL(t *testing.T) {
	for _, test := range []struct {
		url  string
		want bool
	}{
		{portalURL, true},
		{portalURL + "login?created=1", true},
		{"https://PAYROLL-ADMIN-BROWN.VERCEL.APP:443/setup", true},
		{"http://" + portalHost + "/login", false},
		{"https://" + portalHost + ".example.test/login", false},
		{"https://" + portalHost + "@example.test/", false},
		{"https://example.test@" + portalHost + "/", false},
		{"https://" + portalHost + ":444/", false},
		{"file:///C:/data.html", false},
		{"about:blank", false},
		{"//" + portalHost + "/", false},
	} {
		if got := isPortalURL(test.url); got != test.want {
			t.Errorf("isPortalURL(%q) = %v, want %v", test.url, got, test.want)
		}
	}
}
