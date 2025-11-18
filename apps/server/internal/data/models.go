package data

import "database/sql"

type Models struct {
}

func NewModels(db *sql.DB) Models {
	return Models{}
}
