import { db } from "../database";

class TwoFactorRepository {
	async create(user_id: string, temp_secret: string) : Promise<any> {
		const runResult = await db.run(
			`INSERT INTO two_factor_auth(secret, user_id) VALUES (?, ?)`,
			[temp_secret, user_id]
		);

		const createdEntry = await this.get(user_id);

		if (!createdEntry)
			throw new Error('Error creating 2FA');

		return createdEntry;
	}

	async get(user_id: string) : Promise<any> {
		const getResult = await db.get(
			`SELECT * FROM two_factor_auth WHERE id = ?`,
			[user_id]
		);

		console.log(getResult);

		return getResult;
	}
}

export default TwoFactorRepository;