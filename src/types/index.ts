import { JWT_ACCESS_PAYLOAD } from "../utils/auth/Auth"

export interface User {
	id: number,
	first_name: string,
	last_name: string,
	email: string,
	username: string,
	password: string,
	bio: string,
	avatar_url: string,
	created_at: string,
	updated_at: string
};

export interface UserPayload {
	id: number,
	username: string
};

export interface CreateUserRequest {
	username: string,
	password: string | null
};

export interface IRegisterRequest {
	first_name: string,
	last_name: string,
	email: string,
	username: string,
	password: string,
};

export interface ISQLCreateUser {
	email: string,
	username: string,
	password?: string,
	first_name: string,
	last_name: string,
	bio?: string,
	avatar_url: string,
	auth_provider: string
};

export interface ILoginRequest {
	username: string,
	password: string
};

export interface ILogoutRequest {
	access_token: string
};

export interface IOAuthLoginRequest {
	code: string
}

export interface I2FASetupRequest {
	method: string,
	contact: string
}

export interface I2FAConfirmRequest {
	method: string,
	contact: string
}

export interface I2FADisableRequest {
	method: string,
	password: string
}

// export interface RefreshRequest {
// 	username: string,
// 	password: string
// };

export interface AuthenticatedRequest {
	user: UserPayload
}

declare module 'fastify' {
	interface FastifyInstance {
		requireAuth: any,
		authenticate: any
	}
	interface FastifyRequest {
		user: JWT_ACCESS_PAYLOAD | null,
		// id: string
	}
}

export interface ISessionFingerprint {
	device_name: string,
	browser_version: string,
	ip_address: string
}

export interface ErrorResponse {
	success: boolean,
	error: {
		code: string;
		message: string;
		details?: any;
	}
}