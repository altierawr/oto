package database

import (
	"context"
	"strings"

	"github.com/jmoiron/sqlx"
)

func tryDeleteTidalTrackIfUnreferenced(ctx context.Context, tx *sqlx.Tx, trackID int64) error {
	_, err := tx.ExecContext(ctx, `DELETE FROM tidal_tracks WHERE id = $1`, trackID)
	if err == nil {
		return nil
	}

	if strings.Contains(err.Error(), "FOREIGN KEY constraint failed") {
		return nil
	}

	return err
}
