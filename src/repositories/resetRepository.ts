import { db } from "../database";

class ResetPasswordRepository {

	async create(user_id: number, code: string, expires_at: number) {
		const runResult = await db.run(
			`INSERT INTO reset_password (user_id, code, expires_at) VALUES (?, ?, ?)`,
			[user_id, code, expires_at]
		);

		return runResult.lastID;
	}

	async findByUserID(user_id: number) {
		const getResult = await db.get(
			`SELECT user_id, code, expires_at FROM reset_password WHERE user_id = ?`,
			[user_id]
		);

		return getResult;
	}

	async deleteAll(user_id: number) {
		const runResult = await db.run(
			`DELETE FROM reset_password WHERE user_id = ?`,
			[user_id]
		);

		return runResult.changes > 0;
	}
}

export default ResetPasswordRepository;