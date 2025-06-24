import TwoFactorRepository from "../repositories/twoFactorRepository";
import { InternalServerError, InvalidCredentialsError, _2FAInvalidCode, _2FANotFound } from "../types/auth.types";

const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

class TwoFactorService {
	private twoFactorRepository: TwoFactorRepository;

	constructor() {
		this.twoFactorRepository = new TwoFactorRepository();
	}

	async setupAuthenticatorApp(user_id: number) : Promise<{ secret_base32: string, secret_qrcode_url: string }> {
		const temp_secret = this.getAuthenticatorAppSecret();

		const _2fa = await this.twoFactorRepository.create(user_id, temp_secret.base32, 'Google Authenticator');
		if (!_2fa)
			throw new InternalServerError();

		let QRCodeURL;
		try {
			QRCodeURL = await QRCode.toDataURL(temp_secret.otpauth_url);
		} catch (err: any) {
			throw new InternalServerError();
		}

		console.log(`qrcode1 = ${QRCodeURL}`);
		return { secret_base32: temp_secret.base32, secret_qrcode_url: QRCodeURL! };
	}

	async verifyAuthenticatorApp(user_id: number, code: string) : Promise<void> {
		const getResult = await this.twoFactorRepository.findById(user_id);
		if (!getResult)
			throw new _2FANotFound();

		if (!this.verifyAuthenticatorAppCode(getResult.secret, code))
			throw new _2FAInvalidCode();

		if (!getResult.verified && !getResult.enabled) {
			const _2fa = await this.twoFactorRepository.verify_enable(user_id);
			if (!_2fa)
				throw new InternalServerError();
		}

		return ;
	}

	private getAuthenticatorAppSecret() : { base32: string, otpauth_url: string } {
		const temp_secret = speakeasy.generateSecret();

		return { base32: temp_secret.base32, otpauth_url: temp_secret.otpauth_url };
	}

	private verifyAuthenticatorAppCode(secret_base32: string, code: string) : boolean {
		console.log(`verify: ${secret_base32} | ${code}`);
		return speakeasy.totp.verify({
			secret: secret_base32,
			encoding: 'base32',
			token: code
		});
	}
}

export default TwoFactorService;