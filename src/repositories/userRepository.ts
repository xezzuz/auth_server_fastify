import { db } from "../database";
import { CreateUserRequest, ISQLCreateUser, User } from "../types";
import { InternalServerError } from "../types/auth.types";

class UserRepository {

	async create(
		username: string,
		email: string,
		first_name: string,
		last_name: string,
		avatar_url: string,
		auth_provider: string,
		password?: string
	) : Promise<number> {
		
		try {
			const runResult = await db.run(
				`INSERT INTO users (username, password, email, first_name, last_name, avatar_url, auth_provider) VALUES (?, ?, ?, ?, ?, ?, ?)`,
				[username, password, email, first_name, last_name, avatar_url, auth_provider]
			);
			return runResult.lastID;
		} catch (err: any) {
			console.error('SQLite Error: ', err);
			throw new InternalServerError();
		}
	}

	async findById(id: number) : Promise<User | null> {
		try {
			const getResult = await db.get<User>(
				`SELECT * FROM users WHERE id = ?`,
				[id]
			);
			return getResult ?? null;
		} catch (err: any) {
			console.error('SQLite Error: ', err);
			throw new InternalServerError();
		}
	}

	async findByUsername(username: string) : Promise<User | null> {
		try {
			const getResult = await db.get<User>(
				`SELECT * FROM users WHERE username = ?`,
				[username]
			);
			return getResult ?? null;
		} catch (err: any) {
			console.error('SQLite Error: ', err);
			throw new InternalServerError();
		}
	}

	async findByEmail(email: string) : Promise<User | null> {
		try {
			const getResult = await db.get<User>(
				`SELECT * FROM users WHERE email = ?`,
				[email]
			);
			return getResult ?? null;
		} catch (err: any) {
			console.error('SQLite Error: ', err);
			throw new InternalServerError();
		}
	}

	async update(id: number, updates: Partial<Pick<User, 'username' | 'password' | 'first_name' | 'last_name'>>) : Promise<boolean> {
		const keys = [];
		const values = [];

		if (updates.username) {
			keys.push(`username = ?`);
			values.push(updates.username);
		}
		if (updates.password) {
			keys.push(`password = ?`);
			values.push(updates.password);
		}
		if (updates.first_name) {
			keys.push(`first_name = ?`);
			values.push(updates.first_name);
		}
		if (updates.last_name) {
			keys.push(`last_name = ?`);
			values.push(updates.last_name);
		}

		if (keys.length === 0)
			return false;

		keys.push(`updated_at = CURRENT_TIMESTAMP`);
		values.push(id);

		try {
			const runResult = await db.run(
				`UPDATE users SET ${keys.join(', ')} WHERE id = ?`,
				values
			);
			return runResult.changes > 0;
		} catch (err: any) {
			console.error('SQLite Error: ', err);
			throw new InternalServerError();
		}
	}

	async delete(id: number) : Promise<boolean> {
		try {
			const runResult = await db.run(
				`DELETE FROM users WHERE id = ?`,
				[id]
			);
			return runResult.changes > 0;
		} catch (err: any) {
			console.error('SQLite Error: ', err);
			throw new InternalServerError();
		}
	}

	// async exists(username: string, email: string) : Promise<boolean> {
	// 	const usernameResult = await this.findByUsername(username);
	// 	const emailResult = await this.findByEmail(email);

	// 	if (usernameResult || emailResult)
	// 		return true;
	// 	return false;
	// }

	// async existsByUsername(username: string) : Promise<boolean> {
	// 	const usernameResult = await this.findByUsername(username);

	// 	if (usernameResult)
	// 		return true;
	// 	return false;
	// }

	// async existsByEmail(email: string) : Promise<boolean> {
	// 	const emailResult = await this.findByEmail(email);

	// 	if (emailResult)
	// 		return true;
	// 	return false;
	// }
}

export default UserRepository;