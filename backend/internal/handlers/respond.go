package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-playground/validator/v10"

	"cryptolytic/backend/internal/repositories"
)

// Response is the envelope for every API response.
type Response struct {
	Success bool      `json:"success"`
	Data    any       `json:"data,omitempty"`
	Meta    any       `json:"meta,omitempty"`
	Error   *APIError `json:"error,omitempty"`
}

// APIError is the standard error shape.
type APIError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

var validate = validator.New()

func WriteJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

// WriteOK sends a success response with optional data and meta.
func WriteOK(w http.ResponseWriter, data any, meta any) {
	WriteJSON(w, http.StatusOK, Response{Success: true, Data: data, Meta: meta})
}

// WriteCreated sends a 201 success response.
func WriteCreated(w http.ResponseWriter, data any) {
	WriteJSON(w, http.StatusCreated, Response{Success: true, Data: data})
}

// WriteError sends an error response.
func WriteError(w http.ResponseWriter, status int, code, message string) {
	WriteJSON(w, status, Response{
		Success: false,
		Error:   &APIError{Code: code, Message: message},
	})
}

// DecodeJSON parses the request body into dst and validates it.
func DecodeJSON(r *http.Request, dst any) error {
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		return errors.New("invalid JSON body")
	}
	if err := validate.Struct(dst); err != nil {
		var verrs validator.ValidationErrors
		if errors.As(err, &verrs) {
			return err
		}
		return errors.New("validation failed")
	}
	return nil
}

// writeBadRequest handles validation and malformed-request errors.
func writeBadRequest(w http.ResponseWriter, err error) {
	var verrs validator.ValidationErrors
	if errors.As(err, &verrs) {
		WriteJSON(w, http.StatusUnprocessableEntity, Response{
			Success: false,
			Error:   &APIError{Code: "VALIDATION_ERROR", Message: "request failed validation"},
			Data:    ValidationErrors(err),
		})
		return
	}
	WriteError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
}

// writeServiceError maps repository/service errors to HTTP responses.
func writeServiceError(w http.ResponseWriter, err error) {
	if errors.Is(err, repositories.ErrNotFound) {
		WriteError(w, http.StatusNotFound, "NOT_FOUND", "resource not found")
		return
	}
	WriteError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "something went wrong")
}

// bearerToken extracts the raw bearer token from the Authorization header.
func bearerToken(r *http.Request) string {
	h := r.Header.Get("Authorization")
	if len(h) > 7 && h[:7] == "Bearer " {
		return h[7:]
	}
	return ""
}

// ValidationErrors builds a field -> message map for validation failures.
func ValidationErrors(err error) map[string]string {
	out := map[string]string{}
	var verrs validator.ValidationErrors
	if errors.As(err, &verrs) {
		for _, fe := range verrs {
			out[fe.Field()] = fieldMessage(fe)
		}
	}
	return out
}

func fieldMessage(fe validator.FieldError) string {
	switch fe.Tag() {
	case "required":
		return "is required"
	case "email":
		return "must be a valid email address"
	case "min":
		return "is too short"
	case "max":
		return "is too long"
	case "oneof":
		return "must be one of: " + fe.Param()
	case "uppercase":
		return "must be uppercase"
	default:
		return "is invalid"
	}
}
