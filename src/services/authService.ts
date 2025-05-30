import UserRepository from "../repositories/userRepository";
import AuthRepository from "../repositories/authRepository";
import jwt from 'jsonwebtoken'
import { CreateUserRequest, LoginRequest, User } from "../types";
import bcrypt from 'bcrypt';
import AuthUtils, { JWT_TOKEN, JWT_REFRESH_PAYLOAD } from '../utils/auth/Auth'
import { FormError, InvalidCredentialsError, PasswordLengthError, SessionExpiredError, SessionNotFoundError, SessionRevokedError, TokenExpiredError, TokenInvalidError, TokenRequiredError, UserAlreadyExistsError, UserNotFoundError, UsernameLengthError, WeakPasswordError } from "../types/auth.types";

const DEFAULT_BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const SESSION_HARD_EXPIRY = '30d';
const MAX_CONCURRENT_SESSIONS = 4;
const MAX_SESSION_FINGERPRINT_CHANGE = 1;
const BCRYPT_TIMING_HASH = bcrypt.hashSync('xuotjds;glsgf34%(#1fjkfdsfdsklnkcldsaf', 12);

interface AuthConfig {
	bcryptRounds: number,
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
	private authRepository: AuthRepository;
	private authUtils: AuthUtils;
	private authConfig: AuthConfig;

	constructor() {
		this.userRepository = new UserRepository();
		this.authRepository = new AuthRepository();
		this.authUtils = new AuthUtils();
		this.authConfig = {
			bcryptRounds: DEFAULT_BCRYPT_ROUNDS,
			accessTokenExpiry: ACCESS_TOKEN_EXPIRY,
			refreshTokenExpiry: REFRESH_TOKEN_EXPIRY,
			sessionHardExpiry: SESSION_HARD_EXPIRY,
			allowIpChange: true,
			allowBrowserChange: false,
			allowDeviceChange: false,
			maxConcurrentSessions: MAX_CONCURRENT_SESSIONS,
			maxSessionFingerprintChange: MAX_SESSION_FINGERPRINT_CHANGE
		}
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

	async LogIn(userData: LoginRequest, userAgent: string, ip: string) : Promise<{ user: Omit<User, 'password'>, access_token: JWT_TOKEN, refresh_token: JWT_TOKEN }> {
		const { username, password } = userData;

		if (!username || !username.trim() || !password)
			throw new FormError();

		const existingUser = await this.userRepository.findByUsername(username);
		const isValidPassword = await bcrypt.compare(password, existingUser ? existingUser.password : BCRYPT_TIMING_HASH);
		if (!existingUser || !isValidPassword)
			throw new InvalidCredentialsError();

		// clean up expired refresh tokens
		// force max concurrent sessions

		const { accessToken, refreshToken } = await this.authUtils.generateTokenPair(
			existingUser.id,
			this.authConfig.accessTokenExpiry,
			this.authConfig.refreshTokenExpiry
		);

		const runResult = await this.authRepository.createRefreshToken(
			this.authUtils.decodeJWT(refreshToken), 
			this.authUtils.getSessionFingerprint(userAgent, ip)
		);

		const { password: _, ...userWithoutPassword} = existingUser;

		return { user: userWithoutPassword, access_token: accessToken, refresh_token: refreshToken };
	}

	async refresh(authHeader: string | undefined, userAgent: string, ip: string) : Promise<{ access_token: JWT_TOKEN, refresh_token: JWT_TOKEN }> {
		const refreshToken = this.getBearerToken(authHeader);
		
		let decodedRefreshPayload: JWT_REFRESH_PAYLOAD;

		try {
			decodedRefreshPayload = await this.authUtils.verifyRefreshToken(refreshToken);
		} catch (err) {
			if (err instanceof jwt.JsonWebTokenError)
				throw new TokenInvalidError();
			else
				throw new TokenExpiredError('Refresh'); // delete related session
		}
		// extra check up on exp in db

		const getResult = await this.authRepository.findRefreshToken(decodedRefreshPayload.jti, decodedRefreshPayload.sub);
		if (!getResult)
			throw new Error('Invalid Refresh token! :: not found in db :: re-authenticate');
		if (getResult.is_revoked)
			throw new Error('Revoked Refresh token! :: revoked in db :: re-authenticate');
		if (Date.now() / 1000 > getResult.max_age)
			throw new Error('Invalid Refresh token! :: max age reached :: re-authenticate');
		// PROOF OF POSSESION
		const currentSessionFingerprint = this.authUtils.getSessionFingerprint(userAgent, ip);

		if (currentSessionFingerprint.ip_address !== getResult.ip_address)
			throw new Error('Invalid Refresh token! :: ip change :: possible token theft :: re-authenticate');
		if (currentSessionFingerprint.browser_version !== getResult.browser_version)
			throw new Error('Invalid Refresh token! :: browser change :: possible token theft :: re-authenticate');
		if (currentSessionFingerprint.device_name !== getResult.device_name)
			throw new Error('Invalid Refresh token! :: device change :: possible token theft :: re-authenticate');



		const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await this.authUtils.generateTokenPair(
			decodedRefreshPayload.sub,
			this.authConfig.accessTokenExpiry,
			this.authConfig.refreshTokenExpiry
		);

		const updateResult = await this.authRepository.revokeRefreshToken(decodedRefreshPayload.jti);
		const runResult = await this.authRepository.createRefreshToken(this.authUtils.decodeJWT(newRefreshToken), this.authUtils.getSessionFingerprint(userAgent, ip));

		return { newAccessToken, newRefreshToken };
	}

	async logoutFromAllDevices(user_id: number) {
		return await this.authRepository.revokeAllRefreshTokens(user_id);
	}

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

	private async validateRefreshToken(refreshTokenPayload: JWT_REFRESH_PAYLOAD, userAgent: string, ip: string) {
		const isFound = await this.authRepository.findRefreshToken(refreshTokenPayload.jti, refreshTokenPayload.sub);

		if (!isFound) // cleaned
			throw new SessionNotFoundError();
		if (isFound.is_revoked) // re-use
			throw new SessionRevokedError();
		if (Date.now() / 1000 > isFound.max_age) // hard exipry reached
			throw new SessionExpiredError();

		if (this.authConfig.allowIpChange && isFound.ip_address !== ip)
			throw new SessionRevokedError();
		if (this.authConfig.allowBrowserChange && isFound.browser_version !== ip)
			throw new SessionRevokedError();
	}
}

export default AuthService;