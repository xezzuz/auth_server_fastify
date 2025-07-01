import { FastifyReply, FastifyRequest } from "fastify";
import AuthService, { AuthConfig } from "../services/authService";
import { CreateUserRequest, ErrorResponse, I2FAConfirmRequest, I2FASetupRequest, ILoginRequest, ILogoutRequest, IOAuthLoginRequest, IRegisterRequest, IResetPasswordRequest, IResetPasswordUpdateRequest, IResetPasswordVerifyRequest } from "../types";
import bcrypt from 'bcrypt';
import AuthErrorHandler from "./authErrorHandler";
import { AuthError, TokenRequiredError } from "../types/auth.types";
import TwoFactorService from "../services/twoFactorService";
import ResetPasswordService from "../services/resetService";

const DEFAULT_BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const SESSION_HARD_EXPIRY = '30d';
const MAX_CONCURRENT_SESSIONS = 4;
const MAX_SESSION_FINGERPRINT_CHANGE = 1;
const BCRYPT_TIMING_HASH = bcrypt.hashSync('xuotjds;glsgf34%(#1fjkfdsfdsklnkcldsaf', 12);

const authenticationConfig: AuthConfig = {
	bcryptRounds: DEFAULT_BCRYPT_ROUNDS,
	bcryptDummyHash: BCRYPT_TIMING_HASH,
	accessTokenExpiry: ACCESS_TOKEN_EXPIRY,
	refreshTokenExpiry: REFRESH_TOKEN_EXPIRY,
	sessionHardExpiry: SESSION_HARD_EXPIRY,
	allowIpChange: true,
	allowBrowserChange: false,
	allowDeviceChange: false,
	maxConcurrentSessions: MAX_CONCURRENT_SESSIONS,
	maxSessionFingerprintChange: MAX_SESSION_FINGERPRINT_CHANGE
}

class AuthController {
	private authService: AuthService;
	private twoFactorService: TwoFactorService;
	private resetService: ResetPasswordService;

	constructor() {
		this.authService = new AuthService(authenticationConfig);
		this.twoFactorService = new TwoFactorService();
		this.resetService = new ResetPasswordService();
	}

	// REGISTER (NO-AUTO-LOGIN): REGISTERS USER IN DB
	async RegisterEndpoint(request: FastifyRequest, reply: FastifyReply) {
		try {
			const data = request.body as IRegisterRequest;
			
			const createdUser = await this.authService.SignUp(data);
			
			reply.code(201).send({ success: true, data: createdUser});
		} catch (err: any) {
			const response = AuthErrorHandler.handle(err, true);

			reply.code(response.status).send(response.body);
		}
	}
	
	// LOGIN: GENERATES ACCESS / REFRESH TOKENS
	async LoginEndpoint(request: FastifyRequest, reply: FastifyReply) {
		try {
			const data = request.body as ILoginRequest;
			const userAgent = request.headers["user-agent"] || '';
			
			const { user, refreshToken, accessToken } = await this.authService.LogIn(data, userAgent, request.ip);

			reply.code(200).setCookie(
				'refreshToken', refreshToken, {
					path: '/',
					httpOnly: true,
					secure: false,
					sameSite: 'lax'
				}
			).send({ success: true, data: { user, accessToken } });
		} catch (err: any) {
			reply.code(401).send({ success: false, error: err.message });
		}
	}

	// LOGOUT
	async LogoutEndpoint(request: FastifyRequest, reply: FastifyReply) {
		try {
			const userAgent = request.headers["user-agent"] || '';
			// const { access_token } = request.body as ILogoutRequest;
			const refresh_token = request.cookies?.['refreshToken'];
			console.log('cookies: ', request.cookies);
			
			// await this.authService.LogOut(request.headers.authorization, userAgent, request.ip);
			await this.authService.LogOut(refresh_token!, userAgent, request.ip);
			
			reply.code(200).setCookie(
				'refreshToken', '', {
					path: '/',
					httpOnly: true,
					secure: false,
					sameSite: 'lax',
					expires: new Date(0)
				}
			).send({ success: true, data: {} });
		} catch (err: any) {
			reply.code(400).send({ success: false, error: err.message});
		}
	}
	
	// REFRESH: GENERATES ACCESS / REFRESH TOKENS
	async RefreshEndpoint(request: FastifyRequest, reply: FastifyReply) {
		try {
			const userAgent = request.headers["user-agent"] || '';
			const oldRefreshToken = request.cookies?.['refreshToken'];
			console.log('======================================================================================================================================================================================================');
			console.log('refreshToken', oldRefreshToken);
			
			const { newAccessToken: accessToken, newRefreshToken: refreshToken } = await this.authService.Refresh(oldRefreshToken!, userAgent, request.ip);
			
			reply.code(200).setCookie(
				'refreshToken', refreshToken, {
					path: '/',
					httpOnly: true,
					secure: false,
					sameSite: 'lax'
				}
			).send({ success: true, data: { accessToken } });
			// reply.code(200).send({ success: true, data: { accessToken, refreshToken } });
		} catch (err: any) {
			console.log('Error', err);
			reply.code(401).send({ success: false, error: err.message});
		}
	}
	
	// async RevokeAllEndpoint(request: FastifyRequest, reply: FastifyReply) {
	// 	try {
	// 		interface temp  {
	// 			user_id: number
	// 		};

	// 		const { user_id } = request.body as temp;

	// 		throw new Error('Not implemented yet');
	// 		// await this.authService.logoutFromAllDevices(user_id);
	// 		// reply.code(200).send({ success: true, data: {} });
	// 	} catch (err: any) {
	// 		reply.code(400).send({ success: false, error: err.message});
	// 	}
	// }

	async GoogleOAuthEndpoint(request: FastifyRequest, reply: FastifyReply) {
		const { code } = request.query as IOAuthLoginRequest;

		const userAgent = request.headers["user-agent"] || '';

		try {
			const data = await this.authService.GoogleLogIn(code, userAgent, request.ip);
			reply.redirect(`http://localhost:3000/login?access_token=${data.accessToken}&refresh_token=${data.refreshToken}`);
			// reply.code(200).send({ success: true, data });
		} catch (err: any) {
			reply.status(400).send({ success: false, error: err.message });
		}
	}

	async IntraOAuthEndpoint(request: FastifyRequest, reply: FastifyReply) {
		const { code } = request.query as IOAuthLoginRequest;

		const userAgent = request.headers["user-agent"] || '';

		try {
			const data = await this.authService.IntraLogIn(code, userAgent, request.ip);
			reply.redirect(`http://localhost:3000/login?access_token=${data.accessToken}&refresh_token=${data.refreshToken}`);
			// reply.code(200).send({ success: true, data });
		} catch (err: any) {
			reply.status(400).send({ success: false, error: err.message });
		}
	}

	async TwoFactorSetupEndpoint(request: FastifyRequest, reply: FastifyReply) {
		console.log(request.body);
		const { method, contact } = request.body as I2FASetupRequest;
		const user_id = request.user?.sub;

		if (!method || !user_id || ((method === 'email' || method === 'sms') && !contact))
			reply.status(400).send({ success: true, data: {} });

		try {
			if (method === 'totp') {
				const secrets = await this.twoFactorService.setupTOTP(user_id!);

				reply.status(201).send({ success: true, data: secrets });
			} else if (method === 'email' || method === 'sms') {
				await this.twoFactorService.setupOTP(method, contact, user_id!);

				reply.status(201).send({ success: true, data: {} });
			} else {

				reply.status(400).send({ success: false, data: {} });
			}

		} catch (err: any) {
			const response = AuthErrorHandler.handle(err, true);

			reply.code(response.status).send(response.body);
		}
	}

	async TwoFactorConfirmEndpoint(request: FastifyRequest, reply: FastifyReply) {
		console.log(request.body);
		const { method, code } = request.body as I2FAConfirmRequest;
		const user_id = request.user?.sub;

		if (!method || !user_id || !code)
			reply.status(400).send({ success: true, data: {} });

		try {
			if (method === 'totp') {
				await this.twoFactorService.confirmTOTP(code, user_id!);

				reply.status(201).send({ success: true, data: {} });
			} else if (method === 'email' || method === 'sms') {
				await this.twoFactorService.confirmOTP(code, method, user_id!);

				reply.status(201).send({ success: true, data: {} });
			} else {

				reply.status(400).send({ success: true, data: {} });
			}

		} catch (err: any) {
			const response = AuthErrorHandler.handle(err, true);

			reply.code(response.status).send(response.body);
		}
	}

	async TwoFactorVerifyEndpoint(request: FastifyRequest, reply: FastifyReply) {
		console.log(request.body);
		const { method, code } = request.body as I2FAConfirmRequest;
		const user_id = request.user?.sub;

		if (!method || !user_id || !code)
			reply.status(400).send({ success: true, data: {} });

		try {
			if (method === 'totp') {
				await this.twoFactorService.verifyTOTP(code, user_id!);

				reply.status(201).send({ success: true, data: {} });
			} else if (method === 'email' || method === 'sms') {
				await this.twoFactorService.verifyOTP(method, code, user_id!);

				reply.status(201).send({ success: true, data: {} });
			} else {

				reply.status(400).send({ success: true, data: {} });
			}

		} catch (err: any) {
			const response = AuthErrorHandler.handle(err, true);

			reply.code(response.status).send(response.body);
		}
	}
	// disable endpoint

	async ResetPasswordSetupEndpoint(request: FastifyRequest, reply: FastifyReply) {
		const { email } = request.body as IResetPasswordRequest;

		if (!email)
			reply.status(400).send({ success: true, data: {} });

		try {
			const success = await this.resetService.setup(email);
			if (success)
				reply.code(200);
			else
				reply.code(404);
		} catch (err: any) {
			reply.code(500);
		}
	}

	async ResetPasswordVerifyEndpoint(request: FastifyRequest, reply: FastifyReply) {
		const { email, code } = request.body as IResetPasswordVerifyRequest;

		if (!email || !code)
			reply.status(400).send({ success: true, data: {} });

		try {
			const success = await this.resetService.verify(email, code);
			if (success)
				reply.code(200);
			else
				reply.code(404);
		} catch (err: any) {
			reply.code(500);
		}
	}

	async ResetPasswordUpdateEndpoint(request: FastifyRequest, reply: FastifyReply) {
		const { email, code, password } = request.body as IResetPasswordUpdateRequest;

		if (!email || !code || !password)
			reply.status(400).send({ success: true, data: {} });

		try {
			const success = await this.resetService.update(email, code, password);
			if (success)
				reply.code(200);
			else
				reply.code(404);
		} catch (err: any) {
			reply.code(500);
		}
	}
}

export default AuthController;