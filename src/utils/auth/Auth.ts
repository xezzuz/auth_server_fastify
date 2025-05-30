import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto, { hash } from 'crypto';
import {UAParser} from 'ua-parser-js';
import { ObjectLiteralElementLike } from 'typescript';
import { SessionFingerprint } from '../../types';
import { Session } from 'inspector/promises';

// export interface JWT_ACCESS_PAYLOAD {
// 	user_id: number,
// 	username: string,
// 	// role: string
// }
export interface JWT_ACCESS_PAYLOAD {
	sub: number,
	role: string,
	iat: number,
	exp: number
}

export interface JWT_REFRESH_PAYLOAD {
	sub: number,
	jti: string,
	iat: number,
	exp: number
}

export type JWT_TOKEN = string;

const JWT_ACCESS_SECRET = 'jwt-access-secret';
const JWT_REFRESH_SECRET = 'jwt-refresh-secret';

class AuthUtils {
	constructor() {
		
	}
	
	private signJWT<T extends object>(payload: T, JWT_SECRET: string, exp: jwt.SignOptions["expiresIn"] = '15m') : Promise<string> {
		return new Promise((resolve, reject) => {
	
			jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' }, (err, token) => {
				if (err || !token) {
					reject(err);
					return ;
				}
				resolve(token as string);
			});
	
		});
	}
	
	private verifyJWT<T extends object>(token: string, JWT_SECRET: string) : Promise<T> {
		return new Promise((resolve, reject) => {
	
			jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }, (err, decoded) => {
				if (err || !decoded) {
					reject(err);
					return ;
				}
				resolve(decoded as T);
			});
	
		});
	}

	public decodeJWT<T extends object>(token: string) : T {
		const decoded = jwt.decode(token);
		if (!decoded || typeof(decoded) !== 'object')
			throw new Error('Can\'t decode created refresh token!');

		return decoded as T;
	}

	public generateAccessToken(payload: JWT_ACCESS_PAYLOAD, exp = '15m') {
		return this.signJWT(payload, JWT_ACCESS_SECRET, payload.exp);
	}
	
	public generateRefreshToken(payload: JWT_REFRESH_PAYLOAD, exp = '7d') {
		return this.signJWT(payload, JWT_REFRESH_SECRET, payload.exp);
	}

	public verifyAccessToken(token: string) {
		return this.verifyJWT<JWT_ACCESS_PAYLOAD>(token, JWT_ACCESS_SECRET);
	}

	public verifyRefreshToken(token: string) {
		return this.verifyJWT<JWT_REFRESH_PAYLOAD>(token, JWT_REFRESH_SECRET);
	}


	private generateJTI() {
		return crypto.randomBytes(32).toString('hex');
	}

	public getSessionFingerprint(userAgent: string, ip: string) : SessionFingerprint {
		const parser = new UAParser(userAgent);

		const ua = parser.getResult();

		const deviceName = [ ua.device.vendor || '', ua.device.model || '', ua.os.name || '', ua.os.version || ''].filter(Boolean).join(' ').trim();
		const browserVersion = [ ua.browser.name || '', ua.browser.major || '' ].filter(Boolean).join(' ').trim();

		const fingerprint: SessionFingerprint = {
			device_name: deviceName,
			browser_version: browserVersion,
			ip_address: ip
		}

		return fingerprint;
	}

	public async generateTokenPair(user_id: number, accessTokenExpiry: string, refreshTokenExpiry: string) : Promise<{ accessToken: JWT_TOKEN, refreshToken: JWT_TOKEN }> {
		const now = Math.floor(Date.now() / 1000);		// now
		const at_exp = Math.floor(60 * 15);				// 15m
		const rt_exp = Math.floor(60 * 60 * 24 * 7);	// 7d

		const accessPayload: JWT_ACCESS_PAYLOAD = {
			sub: user_id,
			role: 'user',
			iat: now,
			exp: now + at_exp
		}

		const refreshPayload: JWT_REFRESH_PAYLOAD = {
			sub: user_id,
			jti: this.generateJTI(),
			iat: now,
			exp: now + rt_exp
		}

		const accessToken = await this.generateAccessToken(accessPayload);
		const refreshToken = await this.generateRefreshToken(refreshPayload);

		return { accessToken, refreshToken };
	}

}

export default AuthUtils;

























	// GENERATE JWT ACCESS/REFRESH TOKEN
	// async generateJWT(payload: JWT_ACCESS_PAYLOAD | JWT_REFRESH_PAYLOAD, exp: jwt.SignOptions["expiresIn"] = '15m', JWT_SECRET: string) : Promise<JWT_TOKEN> {
	// 	return new Promise((resolve, reject) => {

	// 		jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256', expiresIn: exp }, (err, token) => {
	// 			if (err || !token) {
	// 				reject(err);
	// 				return ;
	// 			}
	// 			resolve(token as JWT_TOKEN);
	// 		});

	// 	});
	// }


	// VERIFY JWT ACCESS/REFRESH TOKEN SIGNATURE
	// async verifyJWT(token: string) : Promise<any> { // Promise<JWT_ACCESS_PAYLOAD | JWT_REFRESH_PAYLOAD>
	// 	return new Promise((resolve, reject) => {

	// 		jwt.verify(token, JWT_ACCESS_SECRET, { algorithms: ['HS256'] }, (err, decoded) => {
	// 			if (err || !decoded) {
	// 				reject(err);
	// 				return ;
	// 			}
	// 			// resolve(decoded as JWT_ACCESS_PAYLOAD | JWT_REFRESH_PAYLOAD);
	// 			resolve(decoded);
	// 		});

	// 	});
	// }

	// // GENERATE JWT REFRESH TOKEN
	// async generateRefreshToken(payload: JWT_REFRESH_PAYLOAD, exp: jwt.SignOptions["expiresIn"] = '7d') : Promise<JWT_REFRESH_TOKEN> {
	// 	return new Promise((resolve, reject) => {

	// 		jwt.sign(payload, JWT_REFRESH_SECRET, { algorithm: 'HS256', expiresIn: exp }, (err, token) => {
	// 			if (err || !token) {
	// 				reject(err);
	// 				return ;
	// 			}
	// 			resolve(token as JWT_REFRESH_TOKEN);
	// 		});

	// 	});
	// }

	// // VERIFY JWT REFRESH TOKEN SIGNATURE
	// async verifyRefreshToken(token: string) : Promise<JWT_REFRESH_PAYLOAD> {
	// 	return new Promise((resolve, reject) => {

	// 		jwt.verify(token, JWT_ACCESS_SECRET, { algorithms: ['HS256'] }, (err, decoded) => {
	// 			if (err || !decoded) {
	// 				reject(err);
	// 				return ;
	// 			}
	// 			resolve(decoded as JWT_REFRESH_PAYLOAD);
	// 		});

	// 	});
	// }

	// HASH REFRESH TOKEN
	// async generateHashedRandomBytes() : Promise<string> {
	// 	const randomBytes = crypto.randomBytes(64).toString('hex');
	// 	const hashedRandomBytes = await bcrypt.hash(randomBytes, 12);

	// 	return hashedRandomBytes;
	// }