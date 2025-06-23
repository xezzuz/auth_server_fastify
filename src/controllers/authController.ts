import { FastifyReply, FastifyRequest } from "fastify";
import AuthService, { AuthConfig } from "../services/authService";
import { CreateUserRequest, ErrorResponse, LoginRequest, RegisterRequest } from "../types";
import bcrypt from 'bcrypt';
import AuthErrorHandler from "./authErrorHandler";
import { AuthError, TokenRequiredError } from "../types/auth.types";

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

	constructor() {
		this.authService = new AuthService(authenticationConfig);
	}

	// REGISTER (NO-AUTO-LOGIN): REGISTERS USER IN DB
	async RegisterEndpoint(request: FastifyRequest, reply: FastifyReply) {
		try {
			const userData = request.body as RegisterRequest;
			
			const createdUser = await this.authService.SignUp(userData);
			
			reply.code(201).send({ success: true, data: createdUser});
		} catch (err: any) {
			const response = AuthErrorHandler.handle(err, true);

			reply.code(response.status).send(response.body);
		}
	}
	
	// LOGIN (NO-AUTO-LOGIN): GENERATES ACCESS / REFRESH TOKENS
	async LoginEndpoint(request: FastifyRequest, reply: FastifyReply) {
		try {
			const userData = request.body as LoginRequest;
			const userAgent = request.headers["user-agent"] || '';
			
			const userAndTokens = await this.authService.LogIn(userData, userAgent, request.ip);

			reply.code(200).send({ success: true, data: userAndTokens });
		} catch (err: any) {
			reply.code(401).send({ success: false, error: err.message });
		}
	}

	// LOGOUT
	async LogoutEndpoint(request: FastifyRequest, reply: FastifyReply) {
		try {
			const userAgent = request.headers["user-agent"] || '';
			
			await this.authService.LogOut(request.headers.authorization, userAgent, request.ip);
			
			reply.code(200).send({ success: true, data: {} });
		} catch (err: any) {
			reply.code(400).send({ success: false, error: err.message});
		}
	}
	
	// REFRESH: GENERATES ACCESS / REFRESH TOKENS
	async RefreshEndpoint(request: FastifyRequest, reply: FastifyReply) {
		console.log(request.headers["user-agent"]);
		try {
			const userAgent = request.headers["user-agent"] || '';
			
			const { newAccessToken: accessToken, newRefreshToken: refreshToken } = await this.authService.Refresh(request.headers.authorization, userAgent, request.ip);
			
			reply.code(200).send({ success: true, data: { accessToken, refreshToken } });
		} catch (err: any) {
			reply.code(400).send({ success: false, error: err.message});
		}
	}
	
	async RevokeAllEndpoint(request: FastifyRequest, reply: FastifyReply) {
		try {
			interface temp  {
				user_id: number
			};

			const { user_id } = request.body as temp;

			throw new Error('Not implemented yet');
			// await this.authService.logoutFromAllDevices(user_id);
			// reply.code(200).send({ success: true, data: {} });
		} catch (err: any) {
			reply.code(400).send({ success: false, error: err.message});
		}
	}

	async GoogleOAuthEndpoint(request: FastifyRequest, reply: FastifyReply) {
		const { code } = request.query as { code?: string };

		const userAgent = request.headers["user-agent"] || '';

		try {
			if (!code)
				throw new Error('Google OAuth Code is required');

			const data = await this.authService.GoogleLogIn(code, userAgent, request.ip);
			reply.redirect(`http://localhost:3000/login?access_token=${data.accessToken}&refresh_token=${data.refreshToken}`);
			// reply.code(200).send({ success: true, data });
		} catch (err: any) {
			reply.status(400).send({ success: false, error: err.message });
		}
	}

	async IntraOAuthEndpoint(request: FastifyRequest, reply: FastifyReply) {
		const { code } = request.query as { code?: string };

		const userAgent = request.headers["user-agent"] || '';

		try {
			if (!code)
				throw new Error('Intra OAuth Code is required');

			const data = await this.authService.IntraLogIn(code, userAgent, request.ip);
			reply.redirect(`http://localhost:3000/login?access_token=${data.accessToken}&refresh_token=${data.refreshToken}`);
			// reply.code(200).send({ success: true, data });
		} catch (err: any) {
			reply.status(400).send({ success: false, error: err.message });
		}
	}
}

export default AuthController;