import { db } from "../database";

class TwoFactorRepository {
	async create(user_id: number, temp_secret: string, type: string) : Promise<any> {
		const runResult = await db.run(
			`INSERT INTO two_factor_auth(secret, user_id, type) VALUES (?, ?, ?)`,
			[temp_secret, user_id, type]
		);

		const createdEntry = await this.findById(user_id);

		if (!createdEntry)
			throw new Error('Error creating 2FA');

		return createdEntry;
	}

	async findById(user_id: number) : Promise<any> {
		const getResult = await db.get(
			`SELECT * FROM two_factor_auth WHERE user_id = ?`,
			[user_id]
		);

		console.log(getResult);

		return getResult;
	}

	async findByUserId(user_id: number) : Promise<any> {
		const getResult = await db.all(
			`SELECT * FROM two_factor_auth WHERE user_id = ?`,
			[user_id]
		);

		console.log(getResult);

		return getResult;
	}

	async verify_enable(user_id: number) : Promise<any> {
		const runResult = await db.run(
			`UPDATE two_factor_auth SET verified = true, enabled = true WHERE user_id = ?`,
			[user_id]
		);

		const updatedEntry = await this.findById(user_id);

		if (!updatedEntry)
			throw new Error('Error updating 2FA');

		return updatedEntry;
	}
}

export default TwoFactorRepository;