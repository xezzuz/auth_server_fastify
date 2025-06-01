import { db } from "../database";
import { CreateUserRequest, User } from "../types";

class UserRepository {

	async create(userData: CreateUserRequest) : Promise<User> {
		const { username, password } = userData;

		const runResult = await db.run(
			`INSERT INTO users (username, password) VALUES (?, ?)`,
			[username, password]
		);

		const createdUser = await db.get<User>(
			`SELECT id, username, password, first_name, last_name, created_at, updated_at FROM users WHERE id = ?`,
			[runResult.lastID]
		);

		if (!createdUser)
			throw new Error(`Error creating user <${username}>!`);

		return createdUser;
	}

	async findById(id: number) : Promise<User | undefined> {
		const getResult = await db.get<User>(
			`SELECT id, username, password, first_name, last_name, created_at, updated_at FROM users WHERE id = ?`,
			[id]
		);

		return getResult;
	}

	async findByUsername(username: string) : Promise<User> {
		const getResult = await db.get<User>(
			`SELECT id, username, password, first_name, last_name, created_at, updated_at FROM users WHERE username = ?`,
			[username]
		);

		return getResult;
	}

	async update(id: number, updates: Partial<Pick<User, 'username' | 'password' | 'first_name' | 'last_name'>>) : Promise<User | undefined> {
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
			return this.findById(id);

		keys.push(`updated_at = CURRENT_TIMESTAMP`);
		values.push(id);

		const runResult = await db.run(
			`UPDATE users SET ${keys.join(', ')} WHERE id = ?`,
			values
		);

		return this.findById(id);
	}

	async delete(id: number) : Promise<boolean> {
		const runResult = await db.run(
			`DELETE FROM users WHERE id = ?`,
			[id]
		);

		return runResult.changes > 0;
	}

	async exists(username: string) : Promise<boolean> {
		const findResult = await this.findByUsername(username);

		if (findResult)
			return true;
		return false;
	}
}

export default UserRepository;