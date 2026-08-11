package services

import (
	"strings"
	"testing"
	"time"
)

func TestRandomKeySecret(t *testing.T) {
	secret, err := randomKeySecret()
	if err != nil {
		t.Fatalf("randomKeySecret() error = %v", err)
	}
	if !strings.HasPrefix(secret, APIKeyPrefix) {
		t.Errorf("secret %q does not start with prefix %q", secret, APIKeyPrefix)
	}
	if len(secret) != len(APIKeyPrefix)+43 {
		t.Errorf("secret length = %d, want %d", len(secret), len(APIKeyPrefix)+43)
	}
	// Two calls must never collide.
	other, _ := randomKeySecret()
	if secret == other {
		t.Errorf("two generated secrets collided: %q", secret)
	}
}

func TestHashAPIKeyDeterministic(t *testing.T) {
	a := hashAPIKey("cl_live_abc")
	b := hashAPIKey("cl_live_abc")
	if a != b {
		t.Errorf("hashAPIKey not deterministic: %q != %q", a, b)
	}
	if a == hashAPIKey("cl_live_abd") {
		t.Errorf("hashAPIKey collided on different inputs")
	}
	// Hashes are hex (64 chars) and never contain the raw secret.
	if strings.Contains(a, "cl_live") {
		t.Errorf("hash leaks the secret prefix: %q", a)
	}
}

func TestMaskAPIKey(t *testing.T) {
	secret := APIKeyPrefix + strings.Repeat("A", 32) + "WXYZ"
	masked := maskAPIKey(secret)
	if strings.Contains(masked, secret[len(APIKeyPrefix):len(APIKeyPrefix)+20]) {
		t.Errorf("masked key leaks the middle of the secret: %q", masked)
	}
	if !strings.HasSuffix(masked, "WXYZ") {
		t.Errorf("masked key should keep the last 4 chars, got %q", masked)
	}
	if !strings.HasPrefix(masked, APIKeyPrefix) {
		t.Errorf("masked key should keep the prefix, got %q", masked)
	}
}

func TestParseRange(t *testing.T) {
	cases := map[string]time.Duration{
		"":      24 * time.Hour,
		"24h":   24 * time.Hour,
		"1d":    24 * time.Hour,
		"7d":    7 * 24 * time.Hour,
		"week":  7 * 24 * time.Hour,
		"30d":   30 * 24 * time.Hour,
		"month": 30 * 24 * time.Hour,
		"90d":   90 * 24 * time.Hour,
		"2h":    2 * time.Hour,
	}
	for in, want := range cases {
		got, err := parseRange(in)
		if err != nil {
			t.Errorf("parseRange(%q) error = %v", in, err)
			continue
		}
		if got != want {
			t.Errorf("parseRange(%q) = %v, want %v", in, got, want)
		}
	}
	if _, err := parseRange("bogus"); err == nil {
		t.Errorf("parseRange(\"bogus\") should error")
	}
}
