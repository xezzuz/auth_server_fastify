import UserRepository from "../repositories/userRepository";
import jwt from 'jsonwebtoken'
import { CreateUserRequest, LoginRequest, User } from "../types";
import bcrypt from 'bcrypt';
import AuthUtils, { JWT_TOKEN, JWT_REFRESH_PAYLOAD } from '../utils/auth/Auth'
import { FormError, InvalidCredentialsError, PasswordLengthError, SessionExpiredError, SessionNotFoundError, SessionRevokedError, TokenExpiredError, TokenInvalidError, TokenRequiredError, UserAlreadyExistsError, UserNotFoundError, UsernameLengthError, WeakPasswordError } from "../types/auth.types";
import SessionManager, { SessionConfig } from "./sessionService";
import { SessionFingerprint } from "../types";
import { UAParser } from 'ua-parser-js';

export interface AuthConfig {
	bcryptRounds: number,
	bcryptDummyHash: string,
	accessTokenExpiry: string,
	refreshTokenExpiry: string,
	sessionHardExpiry: string,
	maxConcurrentSessions: number,
	maxSessionFingerprintChange: number,
	allowIpChange: boolean,
	allowBrowserChange: boolean,
	allowDeviceChange: boolean
}

class AuthService {
	private userRepository: UserRepository;
	private authUtils: AuthUtils;
	private authConfig: AuthConfig;
	private sessionManager: SessionManager;

	constructor(config: AuthConfig) {
		this.authConfig = config;
		this.userRepository = new UserRepository();
		this.sessionManager = new SessionManager(config);
		this.authUtils = new AuthUtils();
	}

	async SignUp(userData: CreateUserRequest) : Promise<{ user: Omit<User, 'password'> }> {
		const { username, password } = userData;

		this.validateUserInput(username, password);

		const isRegistered = await this.userRepository.exists(username); // user enumeration
		if (isRegistered)
			throw new UserAlreadyExistsError('Username');

		const hashedPassword = await bcrypt.hash(password, this.authConfig.bcryptRounds);

		const createdUser = await this.userRepository.create({
			username,
			password: hashedPassword
		});

		const { password: _, ...userWithoutPassword } = createdUser;

		return { user: userWithoutPassword};
	}

	async LogIn(userData: LoginRequest, userAgent: string, ip: string) : Promise<{ user: Omit<User, 'password'>, accessToken: JWT_TOKEN, refreshToken: JWT_TOKEN }> {
		const { username, password } = userData;
		const currentSessionFingerprint = this.getFingerprint(userAgent, ip);

		if (!username || !username.trim() || !password)
			throw new FormError();

		const existingUser = await this.userRepository.findByUsername(username);
		const isValidPassword = await bcrypt.compare(password, existingUser ? existingUser.password : this.authConfig.bcryptDummyHash);
		if (!existingUser || !isValidPassword)
			throw new InvalidCredentialsError();

		// clean up expired refresh tokens
		// force max concurrent sessions

		const { accessToken, refreshToken } = await this.authUtils.generateTokenPair(
			existingUser.id,
			this.authConfig.accessTokenExpiry,
			this.authConfig.refreshTokenExpiry
		);

		await this.sessionManager.createSession(
			refreshToken,
			currentSessionFingerprint
		);

		const { password: _, ...userWithoutPassword} = existingUser;

		return { user: userWithoutPassword, accessToken, refreshToken };
	}

	async LogOut(authHeader: string | undefined, userAgent: string, ip: string) : Promise<void> {
		const refreshToken = this.getBearerToken(authHeader);
		const currentSessionFingerprint = this.getFingerprint(userAgent, ip);

		let payload: JWT_REFRESH_PAYLOAD;
	
		try {
			payload = await this.authUtils.verifyRefreshToken(refreshToken);
		} catch (err) {
			if (err instanceof jwt.JsonWebTokenError)
				throw new TokenInvalidError();
			else {
				this.sessionManager.revokeSession(refreshToken, 'inactivity');
				throw new TokenExpiredError('Refresh'); // delete related session
			}
		}

		await this.sessionManager.validateSession(
			refreshToken,
			currentSessionFingerprint
		);

		await this.sessionManager.revokeSession(
			refreshToken,
			'logout'
		);
	}

	async Refresh(authHeader: string | undefined, userAgent: string, ip: string) : Promise<{ newAccessToken: JWT_TOKEN, newRefreshToken: JWT_TOKEN }> {
		const refreshToken = this.getBearerToken(authHeader);
		const currentSessionFingerprint = this.getFingerprint(userAgent, ip);
		
		let payload: JWT_REFRESH_PAYLOAD;

		try {
			payload = await this.authUtils.verifyRefreshToken(refreshToken);
		} catch (err) {
			if (err instanceof jwt.JsonWebTokenError)
				throw new TokenInvalidError();
			else {
				this.sessionManager.revokeSession(refreshToken, 'inactivity');
				throw new TokenExpiredError('Refresh'); // delete related session
			}
		}
		
		await this.sessionManager.validateSession(
			refreshToken,
			currentSessionFingerprint
		);
		
		const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await this.authUtils.generateTokenPair(
			payload.sub,
			this.authConfig.accessTokenExpiry,
			this.authConfig.refreshTokenExpiry,
			payload.session_id,
			payload.version + 1
		);
		
		await this.sessionManager.refreshSession(
			newRefreshToken,
			currentSessionFingerprint
		);

		return { newAccessToken, newRefreshToken };
	}

	// async logoutFromAllDevices(user_id: number) {
	// 	return await this.authRepository.revokeAllRefreshTokens(user_id);
	// }

	private validateUserInput(username: string | undefined, password: string | undefined) {
		if (!username || !username.trim() || !password)
			throw new FormError();

		if (username.length < 4 || username.length > 20)
			throw new UsernameLengthError();

		if (password.length < 8)
			throw new PasswordLengthError();

		if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password))
			throw new WeakPasswordError();
	}

	private getBearerToken(authHeader: string | undefined) {
		if (!authHeader)
			throw new TokenRequiredError();

		const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
		if (!bearerToken)
			throw new TokenRequiredError();

		return bearerToken;
	}

	private getFingerprint(userAgent: string, ip: string) : SessionFingerprint {
		const parser = new UAParser(userAgent);

		const ua = parser.getResult();

		let deviceName = [ ua.device.vendor || '', ua.device.model || '', ua.os.name || '', ua.os.version || ''].filter(Boolean).join(' ').trim();
		let browserVersion = [ ua.browser.name || '', ua.browser.major || '' ].filter(Boolean).join(' ').trim();

		if (!deviceName)
			deviceName = 'Unknown Device';
		if (!browserVersion)
			browserVersion = 'Unknown Browser';

		const fingerprint: SessionFingerprint = {
			device_name: deviceName,
			browser_version: browserVersion,
			ip_address: ip
		}

		return fingerprint;
	}
}

export default AuthService;