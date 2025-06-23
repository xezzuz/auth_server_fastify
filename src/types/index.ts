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

export interface RegisterRequest {
	email: string,
	username: string,
	password: string,
	first_name: string,
	last_name: string,
};

export interface SQLCreateUser {
	email: string,
	username: string,
	password?: string,
	first_name: string,
	last_name: string,
	bio?: string,
	avatar_url: string,
	auth_provider: string
};

export interface LoginRequest {
	username: string,
	password: string
};

// export interface RefreshRequest {
// 	username: string,
// 	password: string
// };

export interface CreateTodoRequest {
	title: string,
	description?: string,
};

export interface UpdateTodoRequest {
	title?: string,
	description?: string,
	completed?: boolean
};

export interface AuthenticatedRequest {
	user: UserPayload
}

declare module 'fastify' {
	interface FastifyRequest {
		user?: UserPayload,
		id: string
	}
}

export interface SessionFingerprint {
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