import { db } from "./index";

const MIGRATIONS = [
	{
		id: 1,
		name: 'create-users-table',
		sql: `
			CREATE TABLE IF NOT EXISTS users (
				id INTEGER PRIMARY KEY AUTOINCREMENT,

				username TEXT UNIQUE,
				password TEXT,
				first_name TEXT,
				last_name TEXT,

				created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
			)
		`
	},
	{
		id: 2,
		name: 'create-refresh-tokens-table',
		sql: `
			CREATE TABLE IF NOT EXISTS refresh_tokens (
				jti TEXT PRIMARY KEY,

				is_revoked BOOLEAN DEFAULT FALSE,

				device_name TEXT DEFAULT NULL,
				browser_version TEXT DEFAULT NULL,
				ip_address TEXT DEFAULT NULL,

				created_at DATETIME NOT NULL,
				expires_at DATETIME NOT NULL,

				max_age DATETIME NOT NULL,

				user_id INTEGER NOT NULL,
				FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
			)
		`
	}
];

// {
// 	id: 2,
// 	name: 'create-refresh-tokens-table',
// 	sql: `
// 		CREATE TABLE refresh_tokens (
// 			id INTEGER PRIMARY KEY AUTOINCREMENT,

// 			token_hash TEXT NOT NULL,
// 			device_name TEXT DEFAULT NULL,
// 			ip_address TEXT DEFAULT NULL,
// 			user_agent TEXT DEFAULT NULL,
// 			is_revoked BOOLEAN DEFAULT FALSE,
// 			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
// 			expires_at DATETIME NOT NULL,
// 			last_used DATETIME DEFAULT CURRENT_TIMESTAMP,

// 			user_id INTEGER NOT NULL,
// 			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
// 		)
// 	`
// }

async function runMigrations() {

	try {
		for (const migration of MIGRATIONS) {
			await db.run(migration.sql);
			console.log(`Completed migration: ${migration.name}`);
		}

		console.log(`Completed all migrations successfully.`);
	} catch (err) {
		await db.close();
		console.log(`Migration failed: ${err}`);
		process.exit(1);
	}
}

export default runMigrations;