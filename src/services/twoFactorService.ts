import TwoFactorRepository from "../repositories/twoFactorRepository";

const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

class TwoFactorService {
	private twoFactorRepository: TwoFactorRepository;

	constructor() {
		this.twoFactorRepository = new TwoFactorRepository();
	}

	async Setup(user_id: string) : Promise<{ id: string, secret: string }> {
		const temp_secret = speakeasy.generateSecret();
		console.log(temp_secret);
		console.log(temp_secret.base32);
		console.log(temp_secret.otpauth_url);

		try {
			await this.twoFactorRepository.create(user_id, temp_secret.base32);
		} catch (err: any) {
			throw err;
		}

		QRCode.toDataURL(temp_secret.otpauth_url, function(err: any, data_url: any) {
			console.log(data_url);

			console.log('<img src="' + data_url + '">');
		});

		return { id: user_id, secret: temp_secret.base32 };
	}

	async Verify(user_id: string, token: string) : Promise<boolean> {
		try {
			const getResult = await this.twoFactorRepository.get(user_id);

			if (!getResult)
				throw new Error('cannot find 2fa for the user');

			const isVerified = speakeasy.totp.verify({
				secret: getResult.secret,
				encoding: 'base32',
				token
			});

			return isVerified;
		} catch (err: any) {
			throw err;
		}
	}
}

export default TwoFactorService;