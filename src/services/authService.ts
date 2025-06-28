import UserRepository from "../repositories/userRepository";
import jwt from 'jsonwebtoken'
import { CreateUserRequest, ILoginRequest, IRegisterRequest, ISQLCreateUser, User } from "../types";
import bcrypt from 'bcrypt';
import AuthUtils, { JWT_TOKEN, JWT_REFRESH_PAYLOAD } from '../utils/auth/Auth'
import { FormError, FormFieldMissing, InvalidCredentialsError, PasswordLengthError, SessionExpiredError, SessionNotFoundError, SessionRevokedError, TokenExpiredError, TokenInvalidError, TokenRequiredError, UserAlreadyExistsError, UserNotFoundError, UsernameLengthError, WeakPasswordError } from "../types/auth.types";
import SessionManager, { SessionConfig } from "./sessionService";
import { ISessionFingerprint } from "../types";
import { UAParser } from 'ua-parser-js';
import axios from "axios";
import 'dotenv/config';

// TODO
	// VERIFY THE EXISTENCE OF ALL THOSE ENV VARS
const GOOGLE_OAUTH_CLIENT_ID = process.env['GOOGLE_OAUTH_CLIENT_ID'];
const GOOGLE_OAUTH_CLIENT_SECRET = process.env['GOOGLE_OAUTH_CLIENT_SECRET'];
const GOOGLE_OAUTH_BACKEND_REDIRECT_URI = process.env['GOOGLE_OAUTH_BACKEND_REDIRECT_URI'];
const GOOGLE_OAUTH_FRONTEND_REDIRECT_URI = process.env['GOOGLE_OAUTH_FRONTEND_REDIRECT_URI'];
const GOOGLE_OAUTH_AUTH_URI = process.env['GOOGLE_OAUTH_AUTH_URI'];
const GOOGLE_OAUTH_EXCHANGE_URL = process.env['GOOGLE_OAUTH_EXCHANGE_URL'];

const INTRA_OAUTH_CLIENT_ID = process.env['INTRA_OAUTH_CLIENT_ID'];
const INTRA_OAUTH_CLIENT_SECRET = process.env['INTRA_OAUTH_CLIENT_SECRET'];
const INTRA_OAUTH_BACKEND_REDIRECT_URI = process.env['INTRA_OAUTH_BACKEND_REDIRECT_URI'];
const INTRA_OAUTH_FRONTEND_REDIRECT_URI = process.env['INTRA_OAUTH_FRONTEND_REDIRECT_URI'];
const INTRA_OAUTH_AUTH_URI = process.env['INTRA_OAUTH_AUTH_URI'];
const INTRA_OAUTH_EXCHANGE_URL = process.env['INTRA_OAUTH_EXCHANGE_URL'];

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

	async SignUp(data: IRegisterRequest) : Promise<number> { //Promise<{ user: Omit<User, 'password'> }>
		const { first_name, last_name, email, username, password } = data;

		this.validateUserInput(data); // TODO

		if (await this.userRepository.existsByUsername(username))
			throw new UserAlreadyExistsError('Username');
		if (await this.userRepository.existsByEmail(email))
			throw new UserAlreadyExistsError('Email');

		const hashedPassword = await bcrypt.hash(password!, this.authConfig.bcryptRounds);

		const createdUserID = await this.userRepository.create({
			...data,
			password: hashedPassword,
			auth_provider: 'local',
			avatar_url: 'https://pbs.twimg.com/profile_images/1300555471468851202/xtUnFLEm_200x200.jpg'
		});

		return createdUserID;
	}

	async LogIn(data: ILoginRequest, userAgent: string, ip: string) : Promise<{ user: Omit<User, 'password'>, accessToken: JWT_TOKEN, refreshToken: JWT_TOKEN }> {
		const { username, password } = data;
		const currentSessionFingerprint = this.getFingerprint(userAgent, ip);

		// if (!username || !username.trim())
		// 	throw new FormFieldMissing('Username');
		// if (!password || !password.trim())
		// 	throw new FormFieldMissing('Password');
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

	async GoogleLogIn(code: string, userAgent: string, ip: string) : Promise<{ accessToken: JWT_TOKEN, refreshToken: JWT_TOKEN }> {
		try {
			const { id_token } = await this.getGoogleOAuthTokens(code);
			// verify token signature?
			const decodedJWT = jwt.decode(id_token);

			const userData: ISQLCreateUser = this.GoogleOAuthTokenToData(decodedJWT);

			let	  createdUser;
			const usernameExists = await this.userRepository.existsByUsername(userData.username);
			const emailExists = await this.userRepository.existsByEmail(userData.email);
			const isRegistered = usernameExists || emailExists;
			if (!isRegistered) {
				const createdUserID = await this.userRepository.create(userData);
				createdUser = await this.userRepository.findById(createdUserID);
			} else {
				createdUser = await this.userRepository.findByUsername(userData.username);
			}

			const currentSessionFingerprint = this.getFingerprint(userAgent, ip);
			// clean up expired refresh tokens
			// force max concurrent sessions

			const { accessToken, refreshToken } = await this.authUtils.generateTokenPair(
				createdUser!.id,
				this.authConfig.accessTokenExpiry,
				this.authConfig.refreshTokenExpiry
			);

			await this.sessionManager.createSession(
				refreshToken,
				currentSessionFingerprint
			);

			return { accessToken, refreshToken };

		} catch (err) {
			console.log(err);
			throw new Error('OAuth Google failed');
		}
	}

	async IntraLogIn(code: string, userAgent: string, ip: string) : Promise<{ accessToken: JWT_TOKEN, refreshToken: JWT_TOKEN }> {
		try {
			const { access_token } = await this.getIntraOAuthTokens(code);

			const userData: ISQLCreateUser = await this.IntraOAuthTokenToData(access_token);

			let	  createdUser;
			const usernameExists = await this.userRepository.existsByUsername(userData.username);
			const emailExists = await this.userRepository.existsByEmail(userData.email);
			const isRegistered = usernameExists || emailExists;
			if (!isRegistered) {
				const createdUserID = await this.userRepository.create(userData);
				createdUser = await this.userRepository.findById(createdUserID);
			} else {
				createdUser = await this.userRepository.findByUsername(userData.username);
			}

			const currentSessionFingerprint = this.getFingerprint(userAgent, ip);
			// clean up expired refresh tokens
			// force max concurrent sessions

			const { accessToken, refreshToken } = await this.authUtils.generateTokenPair(
				createdUser!.id,
				this.authConfig.accessTokenExpiry,
				this.authConfig.refreshTokenExpiry
			);

			await this.sessionManager.createSession(
				refreshToken,
				currentSessionFingerprint
			);

			return { accessToken, refreshToken };

		} catch (err) {
			console.log(err);
			throw new Error('OAuth Intra failed');
		}
	}

	async LogOut(refreshToken: string, userAgent: string, ip: string) : Promise<void> {
		// const refreshToken = this.getBearerToken(authHeader);
		console.log('refreshToken', refreshToken);
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

	async Refresh(refreshToken: string, userAgent: string, ip: string) : Promise<{ newAccessToken: JWT_TOKEN, newRefreshToken: JWT_TOKEN }> {
		// const refreshToken = this.getBearerToken(authHeader);
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

	private validateUserInput(userData: IRegisterRequest) : void {
		const { username, password, email, first_name, last_name } = userData;

		// if (!username || !username.trim())
		// 	throw new FormFieldMissing('Username');
		// if (!password || !password.trim())
		// 	throw new FormFieldMissing('Password');
		// if (!email || !email.trim())
		// 	throw new FormFieldMissing('Email');
		// if (!first_name || !first_name.trim())
		// 	throw new FormFieldMissing('First_name');
		// if (!last_name || !last_name.trim())
		// 	throw new FormFieldMissing('Last_name');

		// TODO
			// ADD VALIDATION FOR OTHER FIELDS (IMPORT FROM FRONTEND)
		if (username.length < 4 || username.length > 20)
			throw new UsernameLengthError();

		if (password.length < 8)
			throw new PasswordLengthError();

		if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password))
			throw new WeakPasswordError();
	}

	private getBearerToken(authHeader: string | undefined) : string {
		if (!authHeader)
			throw new TokenRequiredError();

		const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
		if (!bearerToken)
			throw new TokenRequiredError();

		return bearerToken;
	}

	private getFingerprint(userAgent: string, ip: string) : ISessionFingerprint {
		const parser = new UAParser(userAgent);

		const ua = parser.getResult();

		let deviceName = [ ua.device.vendor || '', ua.device.model || '', ua.os.name || '', ua.os.version || ''].filter(Boolean).join(' ').trim();
		let browserVersion = [ ua.browser.name || '', ua.browser.major || '' ].filter(Boolean).join(' ').trim();

		if (!deviceName)
			deviceName = 'Unknown Device';
		if (!browserVersion)
			browserVersion = 'Unknown Browser';

		const fingerprint: ISessionFingerprint = {
			device_name: deviceName,
			browser_version: browserVersion,
			ip_address: ip
		}

		return fingerprint;
	}

	private async getGoogleOAuthTokens(code: string): Promise<any> {
		const body = {
			code,
			client_id: GOOGLE_OAUTH_CLIENT_ID,
			client_secret: GOOGLE_OAUTH_CLIENT_SECRET,
			redirect_uri: GOOGLE_OAUTH_BACKEND_REDIRECT_URI,
			grant_type: 'authorization_code'
		};

		const { data } = await axios.post(GOOGLE_OAUTH_EXCHANGE_URL!, body);
		console.log(data);
		return data;
	}

	private GoogleOAuthTokenToData(data: any) : ISQLCreateUser {
		const userData: ISQLCreateUser = {
			email: data.email,
			username: data.email.split('@')[0],
			first_name: data.given_name || data.name.split(' ')[0] || 'Ismail',
			last_name: data.family_name || data.name.split(' ')[1] || 'Demnati',
			avatar_url: data.picture || 'https://pbs.twimg.com/profile_images/1300555471468851202/xtUnFLEm_200x200.jpg',
			auth_provider: 'Google'
		}

		return userData;
	}

	// TODO
		// ADD STATE FOR CSRF
	private async getIntraOAuthTokens(code: string): Promise<any> {
		const body = {
			code,
			client_id: INTRA_OAUTH_CLIENT_ID,
			client_secret: INTRA_OAUTH_CLIENT_SECRET,
			redirect_uri: INTRA_OAUTH_BACKEND_REDIRECT_URI,
			grant_type: 'authorization_code'
		};

		const { data } = await axios.post(INTRA_OAUTH_EXCHANGE_URL!, body);
		console.log(data);
		return data;
	}

	private async IntraOAuthTokenToData(access_token: string) : Promise<ISQLCreateUser> {
		const { data } = await axios.get(`https://api.intra.42.fr/v2/me?access_token=${access_token}`);

		const userData: ISQLCreateUser = {
			email: data.email,
			username: data.login,
			first_name: data.first_name || data.usual_first_name.split(' ')[0] || data.displayname.split(' ')[0],
			last_name: data.last_name || data.usual_last_name.split(' ')[0] || data.displayname.split(' ')[0],
			avatar_url: data.image.link || 'https://pbs.twimg.com/profile_images/1300555471468851202/xtUnFLEm_200x200.jpg',
			auth_provider: '42'
		};

		return userData;
	}
}

export default AuthService;