import { db } from "../database";

class TwoFactorRepository {
	async findEnabled2FAMethods(user_id: number) : Promise<any> {
		const allEnabled2FAMethods = await db.all(
			`SELECT * FROM _2fa_methods WHERE user_id = ?`,
			[user_id]
		);

		return allEnabled2FAMethods;
	}

	async findPending2FAMethods(user_id: number) : Promise<any> {
		const allPending2FAMethods = await db.all(
			`SELECT * FROM pending_2fa WHERE user_id = ?`,
			[user_id]
		);

		return allPending2FAMethods;
	}

	async findEnabled2FAMethodById(id: number) : Promise<any> {
		const enabled2FAMethod = await db.get(
			`SELECT * FROM _2fa_methods WHERE id = ?`,
			[id]
		);

		return enabled2FAMethod;
	}

	async findEnabled2FAMethodByType(type: string, user_id: number) : Promise<any> {
		const enabled2FAMethod = await db.get(
			`SELECT * FROM _2fa_methods WHERE user_id = ? AND method = ?`,
			[user_id, type]
		);

		return enabled2FAMethod;
	}

	async findPending2FAMethodByType(type: string, user_id: number) : Promise<any> {
		const pending2FAMethod = await db.get(
			`SELECT * FROM pending_2fa WHERE user_id = ? AND method = ?`,
			[user_id, type]
		);

		return pending2FAMethod;
	}

	async findOTPById(id: number, user_id: number) : Promise<any> {
		const OTP = await db.get(
			`SELECT * FROM otps WHERE user_id = ? AND id = ?`,
			[user_id, id]
		);

		return OTP;
	}

	async findOTPByType(type: string, user_id: number) : Promise<any> {
		const OTP = await db.get(
			`SELECT * FROM otps WHERE user_id = ? AND method = ?`,
			[user_id, type]
		);

		return OTP;
	}

	async findAllOTPs(user_id: number) : Promise<any> {
		const allOTPs = await db.all(
			`SELECT * FROM otps WHERE user_id = ?`,
			[user_id]
		);

		return allOTPs;
	}
	
	async createPendingTOTP2FAMethod(method: string, totp_temp_code: string, expires_at: number, user_id: number) : Promise<any> {
		const newPending2FAMethod = await db.run(
			`INSERT INTO pending_2fa(method, totp_temp_secret, expires_at, user_id) VALUES (?, ?, ?, ?)`,
			[method, totp_temp_code, expires_at, user_id]
		);

		return await this.findPending2FAMethods(user_id);
	}

	async createPendingOTP2FAMethod(method: string, otp_temp_code: string, expires_at: number, user_id: number) : Promise<any> {
		const newPending2FAMethod = await db.run(
			`INSERT INTO pending_2fa(method, otp_temp_code, expires_at, user_id) VALUES (?, ?, ?, ?)`,
			[method, otp_temp_code, expires_at, user_id]
		);

		return await this.findPending2FAMethods(user_id);
	}

	async enablePending2FATOTPMethod(user_id: number) : Promise<any> {
		const pending2FAMethod = await db.get(
			`SELECT * FROM pending_2fa WHERE user_id = ? AND method = 'totp'`,
			[user_id]
		);

		const new2FAMethod = await db.run(
			`INSERT INTO _2fa_methods(method, totp_secret, user_id) VALUES (?, ?, ?)`,
			[pending2FAMethod.method, pending2FAMethod.totp_temp_secret, pending2FAMethod.user_id]
		);

		await db.run(
			`DELETE FROM pending_2fa WHERE id = ?`,
			[pending2FAMethod.id]
		);

		return await this.findEnabled2FAMethodById(new2FAMethod.lastID);
	}

	async enablePending2FAOTPMethod(method: string, user_id: number) : Promise<any> {
		const pending2FAMethod = await db.get(
			`SELECT * FROM pending_2fa WHERE user_id = ? AND method = ?`,
			[user_id, method]
		);

		const new2FAMethod = await db.run(
			`INSERT INTO _2fa_methods(method, user_id) VALUES (?, ?)`,
			[pending2FAMethod.method, pending2FAMethod.user_id]
		);

		await db.run(
			`DELETE FROM pending_2fa WHERE id = ?`,
			[pending2FAMethod.id]
		);

		return await this.findEnabled2FAMethodById(new2FAMethod.lastID);
	}

	// async create2FAMethodFromPending(pending_2fa_id: number) : Promise<any> {
	// 	const pending2FAMethod = await db.get(
	// 		`SELECT * FROM pending_2fa WHERE id = ?`,
	// 		[pending_2fa_id]
	// 	);

	// 	const new2FAMethod = await db.run(
	// 		`INSERT INTO _2fa_methods(method, totp_secret, user_id) VALUES (?, ?, ?)`,
	// 		[pending2FAMethod.method, pending2FAMethod.totp_secret, pending2FAMethod.user_id]
	// 	);

	// 	return await this.findEnabled2FAMethodById(new2FAMethod.lastID);
	// }

	async createOTP(method: string, code: number, expires_at: number, user_id: number) : Promise<any> {
		const newOTP = await db.run(
			`INSERT INTO otps(method, code, expires_at, user_id) VALUES (?, ?, ?, ?)`,
			[method, code, expires_at, user_id]
		);

		return await this.findEnabled2FAMethodById(newOTP.lastID);
	}

	async deleteAllEnabled2FA(user_id: number) {
		const runResult = await db.run(
			`DELETE FROM _2fa_methods WHERE user_id = ?`,
			[user_id]
		);
	}

	async deleteAllPending2FA(user_id: number) {
		const runResult = await db.run(
			`DELETE FROM pending_2fa WHERE user_id = ?`,
			[user_id]
		);
	}
	
	async deleteEnabled2FAById(id: number) {
		const runResult = await db.run(
			`DELETE FROM _2fa_methods WHERE id = ?`,
			[id]
		);
	}

	async deleteEnabled2FAByType(type: string, user_id: number) {
		const runResult = await db.run(
			`DELETE FROM _2fa_methods WHERE user_id = ? method = ?`,
			[user_id, type]
		);
	}

	async deletePending2FAById(id: number) {
		const runResult = await db.run(
			`DELETE FROM pending_2fa WHERE id = ?`,
			[id]
		);
	}

	async deletePending2FAByType(type: string, user_id: number) {
		const runResult = await db.run(
			`DELETE FROM pending_2fa WHERE user_id = ? method = ?`,
			[user_id, type]
		);
	}

	async deleteAllOTPs(user_id: number) {
		const runResult = await db.run(
			`DELETE FROM otps WHERE user_id = ?`,
			[user_id]
		);
	}

	async deleteOTPById(id: number, user_id: number) {
		const runResult = await db.run(
			`DELETE FROM otps WHERE user_id = ? AND id = ?`,
			[user_id, id]
		);
	}
}

export default TwoFactorRepository;