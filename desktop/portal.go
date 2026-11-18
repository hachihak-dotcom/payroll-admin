package main

import (
	"net/url"
	"strings"
)

const (
	portalHost = "payroll-admin-brown.vercel.app"
	portalURL  = "https://" + portalHost + "/"
)

func isPortalURL(raw string) bool {
	parsed, err := url.Parse(raw)
	if err != nil || parsed.User != nil || parsed.Scheme != "https" {
		return false
	}
	return strings.EqualFold(parsed.Host, portalHost) || strings.EqualFold(parsed.Host, portalHost+":443")
}
