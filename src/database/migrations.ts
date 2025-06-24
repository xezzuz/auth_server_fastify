import { db } from "./index";

const MIGRATIONS = [
	{
		// TODO
			// ACCOUNT STATUS
			// IS DELETED
		id: 1,
		name: 'create-users-table',
		sql: `
			CREATE TABLE IF NOT EXISTS users (
				id INTEGER PRIMARY KEY AUTOINCREMENT,

				email TEXT UNIQUE NOT NULL,
				username TEXT UNIQUE NOT NULL,
				password TEXT,
				first_name TEXT NOT NULL,
				last_name TEXT NOT NULL,
				bio TEXT DEFAULT 'DFK',
				avatar_url TEXT DEFAULT 'https://pbs.twimg.com/profile_images/1300555471468851202/xtUnFLEm_200x200.jpg',
				auth_provider TEXT DEFAULT 'local',
				role TEXT DEFAULT 'user',

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
				session_id TEXT PRIMARY KEY,

				version INTEGER DEFAULT 1,
				is_revoked BOOLEAN DEFAULT FALSE,
				reason TEXT,

				device_name TEXT NOT NULL,
				browser_version TEXT NOT NULL,
				ip_address TEXT NOT NULL,

				created_at DATETIME NOT NULL,
				expires_at DATETIME NOT NULL,

				updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

				user_id INTEGER NOT NULL,
				FOREIGN KEY (user_id) REFERENCES users(id)
			)
		`
	},
	{
		id: 3,
		name: 'create-two-factor-auth-table',
		sql: `
			CREATE TABLE IF NOT EXISTS _2fa_methods (
				id INTEGER PRIMARY KEY AUTOINCREMENT, -- 2FA ID
				
				method TEXT NOT NULL, -- email, sms, totp,
				totp_secret TEXT,

				user_id INTEGER NOT NULL,
				FOREIGN KEY (user_id) REFERENCES users(id)
			)
		`
	},
	{
		id: 4,
		name: 'create-pending-2fa-table',
		sql: `
			CREATE TABLE IF NOT EXISTS pending_2fa (
				id INTEGER PRIMARY KEY AUTOINCREMENT, -- 2FA ID
				
				method TEXT NOT NULL, -- email, sms, totp,
				otp_temp_code INTEGER,
				totp_temp_secret TEXT,

				expires_at DATETIME,

				user_id INTEGER NOT NULL,
				FOREIGN KEY (user_id) REFERENCES users(id)
			)
		`
	},
	{
		id: 5,
		name: 'create-otps-table',
		sql: `
			CREATE TABLE IF NOT EXISTS otps (
				id INTEGER PRIMARY KEY AUTOINCREMENT, -- OTP ID
				
				method TEXT NOT NULL, -- email, sms,
				code INTEGER,

				expires_at DATETIME,

				user_id INTEGER NOT NULL,
				FOREIGN KEY (user_id) REFERENCES users(id)
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