// Package migrations embeds the SQL schema files so the binary is
// self-contained and migrations run automatically on startup.
package migrations

import (
	"embed"
	"fmt"
	"sort"
	"strconv"
	"strings"
)

//go:embed *.sql
var files embed.FS

// File is a single ordered migration file.
type File struct {
	Version int
	Name    string
	SQL     string
}

// All returns the migrations sorted by version, with the numeric version
// parsed from the leading six digits of the filename (e.g. 000001_init.sql).
func All() ([]File, error) {
	entries, err := files.ReadDir(".")
	if err != nil {
		return nil, fmt.Errorf("read embedded migrations: %w", err)
	}

	var out []File
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".sql") {
			continue
		}
		data, err := files.ReadFile(e.Name())
		if err != nil {
			return nil, fmt.Errorf("read migration %s: %w", e.Name(), err)
		}
		version := 0
		if len(e.Name()) >= 6 {
			if n, perr := strconv.Atoi(e.Name()[:6]); perr == nil {
				version = n
			}
		}
		out = append(out, File{Version: version, Name: e.Name(), SQL: string(data)})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Version < out[j].Version })
	return out, nil
}
