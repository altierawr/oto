package main

import (
	"context"
	"net/http"

	"github.com/google/uuid"
)

type contextKey string

const userIdContextKey = contextKey("userId")

const userRoleContextKey = contextKey("userRole")

type UserRole string

const (
	UserRoleAnonymous UserRole = "anonymous"
	UserRoleUser      UserRole = "user"
	UserRoleAdmin     UserRole = "admin"
)

func (app *application) contextSetUserId(r *http.Request, id *uuid.UUID) *http.Request {
	ctx := context.WithValue(r.Context(), userIdContextKey, id)
	return r.WithContext(ctx)
}

func (app *application) contextGetUserId(r *http.Request) *uuid.UUID {
	id, ok := r.Context().Value(userIdContextKey).(*uuid.UUID)
	if !ok {
		return nil
	}

	return id
}

func (app *application) contextSetUserRole(r *http.Request, role UserRole) *http.Request {
	ctx := context.WithValue(r.Context(), userRoleContextKey, role)
	return r.WithContext(ctx)
}

func (app *application) contextGetUserRole(r *http.Request) UserRole {
	role, ok := r.Context().Value(userRoleContextKey).(UserRole)
	if !ok {
		panic("missing user value in request context")
	}

	return role
}
