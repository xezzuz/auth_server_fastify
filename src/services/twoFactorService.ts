import TwoFactorRepository from "../repositories/twoFactorRepository";
import { InternalServerError, InvalidCredentialsError, _2FAInvalidCode, _2FANotFound } from "../types/auth.types";

const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

class TwoFactorService {
	private twoFactorRepository: TwoFactorRepository;

	constructor() {
		this.twoFactorRepository = new TwoFactorRepository();
	}

	async setupTOTP(user_id: number) : Promise<{ secret_base32: string, secret_qrcode_url: string }> {
		const totp_temp_secret = this.generateTOTPSecret();

		// if a totp enabled method is already setup => we need to remove it
		// a user can't have an active method of the same type at the same time

		const pending2FA = await this.twoFactorRepository.createPendingTOTP2FAMethod(
			'totp',
			totp_temp_secret.base32,
			this.nowPlusMinutes(10),
			user_id
		);

		if (!pending2FA)
			throw new InternalServerError();

		let QRCodeURL;
		try {
			QRCodeURL = await QRCode.toDataURL(totp_temp_secret.otpauth_url);
		} catch (err: any) {
			throw new InternalServerError();
		}

		console.log(`setupTOTP = ${{ secret_base32: totp_temp_secret.base32, secret_qrcode_url: QRCodeURL! }}`);
		return { secret_base32: totp_temp_secret.base32, secret_qrcode_url: QRCodeURL! };
	}

	async setupOTP(method: string, contact: string, user_id: number) : Promise<void> {
		const otp_temp_code = this.generateOTP();

		const pending2FA = await this.twoFactorRepository.createPendingOTP2FAMethod(
			method,
			otp_temp_code,
			this.nowPlusMinutes(5),
			user_id
		);

		if (!pending2FA)
			throw new InternalServerError();

		if (method === 'email')
			this.sendEmail(contact, otp_temp_code);
		else if (method === 'sms')
			this.sendSMS(contact, otp_temp_code);

		return ;
	}

	async confirmTOTP(totp_code: string, user_id: number) : Promise<void> {
		const pendingTOTP2FA = await this.twoFactorRepository.findPending2FAMethodByType('totp', user_id);
		if (!pendingTOTP2FA)
			throw new Error('TOTP expired!');

		if (!this.verifyTOTP(pendingTOTP2FA.totp_temp_secret, totp_code))
			throw new _2FAInvalidCode();

		const newTOTP2FA = await this.twoFactorRepository.enablePending2FATOTPMethod(user_id);
		if (!newTOTP2FA)
			throw new InternalServerError();

		console.log(`TOTP is verified, deleted from pending, added to active 2fa`);
		
		return ;
	}
	
	async confirmOTP(otp_code: number, method: string, user_id: number) : Promise<void> {
		const pendingOTP2FA = await this.twoFactorRepository.findPending2FAMethodByType(method, user_id);
		if (!pendingOTP2FA)
			throw new Error('OTP expired!');
		
		if (!this.verifyOTP(otp_code, pendingOTP2FA.otp_temp_code))
			throw new _2FAInvalidCode();
		
		const newTOTP2FA = await this.twoFactorRepository.enablePending2FAOTPMethod(method, user_id);
		if (!newTOTP2FA)
			throw new InternalServerError();

		console.log(`OTP by ${method} is verified, deleted from pending, added to active 2fa`);
	}

	private generateTOTPSecret() : { base32: string, otpauth_url: string } {
		const temp_secret = speakeasy.generateSecret();

		return { base32: temp_secret.base32, otpauth_url: temp_secret.otpauth_url };
	}

	private verifyTOTP(secret_base32: string, code: string) : boolean {
		console.log(`verify: ${secret_base32} | ${code}`);
		return speakeasy.totp.verify({
			secret: secret_base32,
			encoding: 'base32',
			token: code
		});
	}

	private verifyOTP(incoming_code: number, stored_code: number) {
		return incoming_code === stored_code;
	}

	private generateOTP() {
		return ('' + Math.floor(100000 + Math.random() * 90000));
	}

	private nowPlusMinutes(minutes: number) {
		return Date.now() + minutes * 60000;
	}

	private sendEmail(email: string, code: string) {
		console.log(`Email sent to ${email} with code: ${code}`);
	}

	private sendSMS(phone: string, code: string) {
		console.log(`SMS sent to ${phone} with code: ${code}`);
	}
}

export default TwoFactorService;