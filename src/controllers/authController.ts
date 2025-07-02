import { FastifyReply, FastifyRequest } from "fastify";
import AuthService, { AuthConfig } from "../services/authService";
import { CreateUserRequest, ErrorResponse, I2FAConfirmRequest, I2FASetupRequest, ILoginRequest, ILogoutRequest, IOAuthLoginRequest, IRegisterRequest, IResetPasswordRequest, IResetPasswordUpdateRequest, IResetPasswordVerifyRequest } from "../types";
import bcrypt from 'bcrypt';
import AuthErrorHandler from "./authResponseFactory";
import { TokenRequiredError } from "../types/auth.types";
import TwoFactorService from "../services/twoFactorService";
import ResetPasswordService from "../services/resetService";
import AuthResponseFactory from "./authResponseFactory";

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
			const { first_name, last_name, username, email, password } = request.body as IRegisterRequest;
			
			await this.authService.SignUp(first_name, last_name, username, email, password);

			const { status, body } = AuthResponseFactory.getSuccessResponse(201, {});
			
			reply.code(status).send(body);
		} catch (err: any) {
			const { status, body } = AuthResponseFactory.getErrorResponse(err);

			reply.code(status).send(body);
		}
	}
	
	// LOGIN: GENERATES ACCESS / REFRESH TOKENS
	async LoginEndpoint(request: FastifyRequest, reply: FastifyReply) {
		try {
			const { username, password } = request.body as ILoginRequest;
			const userAgent = request.headers["user-agent"] || '';
			
			const { user, refreshToken, accessToken } 
				= await this.authService.LogIn(username, password, userAgent, request.ip);

			const { status, body } = AuthResponseFactory.getSuccessResponse(200, { user, accessToken });

			reply.code(status).setCookie(
				'refreshToken', refreshToken, {
					path: '/',
					httpOnly: true,
					secure: false,
					sameSite: 'lax'
				}
			).send(body);
		} catch (err: any) {
			const { status, body } = AuthResponseFactory.getErrorResponse(err);

			reply.code(status).send(body);
		}
	}

	// LOGOUT
	async LogoutEndpoint(request: FastifyRequest, reply: FastifyReply) {
		try {
			const userAgent = request.headers["user-agent"] || '';
			// const { access_token } = request.body as ILogoutRequest;
			const refresh_token = request.cookies?.['refreshToken'];
			// console.log('cookies: ', request.cookies);
			
			await this.authService.LogOut(refresh_token!, userAgent, request.ip);

			const { status, body } = AuthResponseFactory.getSuccessResponse(200, {});
			
			reply.code(status).setCookie(
				'refreshToken', '', {
					path: '/',
					httpOnly: true,
					secure: false,
					sameSite: 'lax',
					expires: new Date(0)
				}
			).send(body);
		} catch (err: any) {
			const { status, body } = AuthResponseFactory.getErrorResponse(err);

			reply.code(status).send(body);
		}
	}
	
	// REFRESH: GENERATES ACCESS / REFRESH TOKENS
	async RefreshEndpoint(request: FastifyRequest, reply: FastifyReply) {
		try {
			const userAgent = request.headers["user-agent"] || '';
			const oldRefreshToken = request.cookies?.['refreshToken'];
			if (!oldRefreshToken)
				throw new TokenRequiredError();
			console.log('======================================================================================================================================================================================================');
			console.log('refreshToken', oldRefreshToken);
			
			const { newAccessToken: accessToken, newRefreshToken: refreshToken } = await this.authService.Refresh(oldRefreshToken!, userAgent, request.ip);

			const { status, body } = AuthResponseFactory.getSuccessResponse(200, { accessToken });

			reply.code(status).setCookie(
				'refreshToken', refreshToken, {
					path: '/',
					httpOnly: true,
					secure: false,
					sameSite: 'lax'
				}
			).send(body);
			// reply.code(200).send({ success: true, data: { accessToken, refreshToken } });
		} catch (err: any) {
			const { status, body } = AuthResponseFactory.getErrorResponse(err);

			reply.code(status).send(body);
		}
	}

	async GoogleOAuthEndpoint(request: FastifyRequest, reply: FastifyReply) {
		const { code } = request.query as IOAuthLoginRequest;

		const userAgent = request.headers["user-agent"] || '';

		try {
			const { accessToken, refreshToken} = await this.authService.GoogleLogIn(code, userAgent, request.ip);

			const { status, body } = AuthResponseFactory.getSuccessResponse(200, {});

			reply.redirect(`http://localhost:3000/login?access_token=${accessToken}&refresh_token=${refreshToken}`);
		} catch (err: any) {
			const { status, body } = AuthResponseFactory.getErrorResponse(err);

			reply.code(status).send(body);
		}
	}

	async IntraOAuthEndpoint(request: FastifyRequest, reply: FastifyReply) {
		const { code } = request.query as IOAuthLoginRequest;

		const userAgent = request.headers["user-agent"] || '';

		try {
			const { accessToken, refreshToken} = await this.authService.IntraLogIn(code, userAgent, request.ip);

			const { status, body } = AuthResponseFactory.getSuccessResponse(200, {});

			reply.redirect(`http://localhost:3000/login?access_token=${accessToken}&refresh_token=${refreshToken}`);
			// reply.code(200).send({ success: true, data });
		} catch (err: any) {
			const { status, body } = AuthResponseFactory.getErrorResponse(err);

			reply.code(status).send(body);
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

			const { status, body } = AuthResponseFactory.getSuccessResponse(200, {});

		} catch (err: any) {
			const { status, body } = AuthResponseFactory.getErrorResponse(err);

			reply.code(status).send(body);
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

			const { status, body } = AuthResponseFactory.getSuccessResponse(200, {});

		} catch (err: any) {
			const { status, body } = AuthResponseFactory.getErrorResponse(err);

			reply.code(status).send(body);
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

			const { status, body } = AuthResponseFactory.getSuccessResponse(200, {});

		} catch (err: any) {
			const { status, body } = AuthResponseFactory.getErrorResponse(err);

			reply.code(status).send(body);
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

			const { status, body } = AuthResponseFactory.getSuccessResponse(200, {});
		} catch (err: any) {
			const { status, body } = AuthResponseFactory.getErrorResponse(err);

			reply.code(status).send(body);
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

			const { status, body } = AuthResponseFactory.getSuccessResponse(200, {});
		} catch (err: any) {
			const { status, body } = AuthResponseFactory.getErrorResponse(err);

			reply.code(status).send(body);
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

			const { status, body } = AuthResponseFactory.getSuccessResponse(200, {});
		} catch (err: any) {
			const { status, body } = AuthResponseFactory.getErrorResponse(err);

			reply.code(status).send(body);
		}
	}
}

export default AuthController;