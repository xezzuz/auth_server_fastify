export interface User {
	id: number,
	username: string,
	password: string,
	first_name: string,
	last_name: string,
	created_at: string,
	updated_at: string
};

export interface Todo {
	id: number,
	title: string,
	description: string,
	completed: boolean,
	user_id: number,
	created_at: string,
	updated_at: string
};

export interface UserPayload {
	id: number,
	username: string
};

export interface CreateUserRequest {
	username: string,
	password: string
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