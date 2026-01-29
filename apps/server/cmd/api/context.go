package main

import (
	"context"
	"net/http"
)

type contextKey string

const userContextKey = contextKey("user")

type UserRole string

const (
	UserRoleAnonymous UserRole = "anonymous"
	UserRoleUser      UserRole = "user"
	UserRoleAdmin     UserRole = "admin"
)

func (app *application) contextSetUserRole(r *http.Request, role UserRole) *http.Request {
	ctx := context.WithValue(r.Context(), userContextKey, role)
	return r.WithContext(ctx)
}

func (app *application) contextGetUserRole(r *http.Request) UserRole {
	role, ok := r.Context().Value(userContextKey).(UserRole)
	if !ok {
		panic("missing user value in request context")
	}

	return role
}
