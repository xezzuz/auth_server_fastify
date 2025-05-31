import AuthUtils from "../utils/auth/Auth";
import { SessionFingerprint } from "../types";
import SessionRepository from "../repositories/sessionRepository";
import { JWT_REFRESH_PAYLOAD } from "../utils/auth/Auth";
import { SessionExpiredError, SessionRevokedError, SessionNotFoundError } from "../types/auth.types";

const SESSION_EXPIRY = '30d';
const MAX_CONCURRENT_SESSIONS = 4;
const MAX_SESSION_FINGERPRINT_CHANGE = 1;

interface SessionConfig {
	sessionExpiry: string,
	maxConcurrentSessions: number,
	maxSessionFingerprintChange: number,
	allowIpChange: boolean,
	allowBrowserChange: boolean,
	allowDeviceChange: boolean
}

class SessionManager {
	private authUtils: AuthUtils;
	private sessionRepository: SessionRepository;
	private sessionConfig: SessionConfig;

	constructor() {
		this.authUtils = new AuthUtils();
		this.sessionRepository = new SessionRepository();
		this.sessionConfig = {
			sessionExpiry: SESSION_EXPIRY,
			maxConcurrentSessions: MAX_CONCURRENT_SESSIONS,
			maxSessionFingerprintChange: MAX_SESSION_FINGERPRINT_CHANGE,
			allowIpChange: true,
			allowBrowserChange: false,
			allowDeviceChange: false
		}
	}

	public async createSession(refreshToken: string, currentSessionFingerprint: SessionFingerprint) {
		const { device_name, browser_version, ip_address }: SessionFingerprint = currentSessionFingerprint;
		const { session_id, iat: created_at, sub: user_id }: JWT_REFRESH_PAYLOAD = this.authUtils.decodeJWT(refreshToken);
		
		const expires_at = Math.floor((Date.now() / 1000) + (60 * 60 * 24 * 30)); // 30d
		
		await this.sessionRepository.create(
			session_id,
			device_name,
			browser_version,
			ip_address,
			created_at,
			expires_at,
			user_id
		);
	}
	
	public async refreshSession(newRefreshToken: string, newSessionFingerprint: SessionFingerprint) {
		const { device_name, browser_version, ip_address }: SessionFingerprint = newSessionFingerprint;
		const { session_id, version, sub: user_id }: JWT_REFRESH_PAYLOAD = this.authUtils.decodeJWT(newRefreshToken);
		
		const isFound = await this.sessionRepository.findOne(session_id, user_id);

		if (!isFound)
			throw new SessionNotFoundError();
		
		await this.sessionRepository.update(
			session_id,
			user_id,
			{
				version: version,
				device_name: device_name,
				browser_version: browser_version,
				ip_address: ip_address
			}
		);
	}
	
	public async validateSession(refreshToken: string, newSessionFingerprint: SessionFingerprint) {
		const { device_name, browser_version, ip_address }: SessionFingerprint = newSessionFingerprint;
		const { session_id, version, sub: user_id }: JWT_REFRESH_PAYLOAD = this.authUtils.decodeJWT(refreshToken);

		const isFound = await this.sessionRepository.findOne(session_id, user_id);
		console.log('New Session: ');
		console.log(newSessionFingerprint);
		console.log('DB Session: ');
		console.log(isFound);

		if (!isFound) // CLEANED
			throw new SessionNotFoundError();

		if (isFound.version !== version) // RE-USE
			throw new SessionRevokedError();
		if (isFound.is_revoked) // EXPIRED
			throw new SessionRevokedError();
		if ((Date.now() / 1000) > isFound.expires_at) // EXPIRED
			throw new SessionExpiredError();

		if (!this.sessionConfig.allowIpChange && isFound.ip_address !== ip_address) // IP CHANGE
			throw new SessionRevokedError();
		if (!this.sessionConfig.allowDeviceChange && isFound.device_name !== device_name) // DEVICE CHANGE
			throw new SessionRevokedError();
		if (!this.sessionConfig.allowBrowserChange && isFound.browser_version !== browser_version) // BROWSER CHANGE
			throw new SessionRevokedError();
	}

	public async revokeSession(refreshToken: string, reason: string) { // params?
		const { session_id, sub: user_id }: JWT_REFRESH_PAYLOAD = this.authUtils.decodeJWT(refreshToken);

		await this.sessionRepository.update(
			session_id,
			user_id,
			{
				is_revoked: true,
				reason: reason
			}
		);
	}

	public async revokeAllSessions(refreshToken: string, reason: string) { // params?
		const { sub: user_id }: JWT_REFRESH_PAYLOAD = this.authUtils.decodeJWT(refreshToken);

		await this.sessionRepository.updateAll(
			user_id,
			{
				is_revoked: true,
				reason: reason
			}
		);
	}
}

export default SessionManager;