package data

import (
	"database/sql/driver"
	"fmt"
	"time"
)

type UnixTime struct {
	time.Time
}

// Scan implements sql.Scanner for reading from database
func (ut *UnixTime) Scan(value any) error {
	if value == nil {
		return fmt.Errorf("cannot scan NULL into UnixTime")
	}

	var timestamp int64
	switch v := value.(type) {
	case int64:
		timestamp = v
	case int:
		timestamp = int64(v)
	case int32:
		timestamp = int64(v)
	default:
		return fmt.Errorf("cannot scan %T into UnixTime", value)
	}

	ut.Time = time.Unix(timestamp, 0)
	return nil
}

// Value implements driver.Valuer for writing to database
func (ut UnixTime) Value() (driver.Value, error) {
	return ut.Time.Unix(), nil
}
