export abstract class AuthError extends Error {
	public readonly statusCode: number;
	public readonly errorCode: string;
	public readonly timestamp: Date;

	constructor(message: string, statusCode: number, errorCode: string) {
		super(message);
		this.statusCode = statusCode;
		this.errorCode = errorCode;
		this.timestamp = new Date();
	}
}

// FORM (REGISTER)
export class FormError extends AuthError {
	constructor(message: string = 'Username and password are required') {
		super(message, 400, 'AUTH_FORM_INCOMPLETE');
	}
}

export class UsernameLengthError extends AuthError {
	constructor(message: string = 'Username must be between 4 and 20 characters') {
		super(message, 400, 'AUTH_USERNAME_LENGTH');
	}
}

export class PasswordLengthError extends AuthError {
	constructor(message: string = 'Password must be at least 8 characters long') {
		super(message, 400, 'AUTH_PASS_LENGTH');
	}
}
export class WeakPasswordError extends AuthError {
	constructor(message: string = 'Password must contain at least one uppercase letter, one lowercase letter, and one number') {
		super(message, 400, 'AUTH_WEAK_PASSWORD');
	}
}

// USER REGISTRATION
export class UserAlreadyExistsError extends AuthError {
	constructor(conflict: string) {
		const msg = `${conflict} already taken`;
		const code = `AUTH_${conflict.toUpperCase()}_TAKEN`;
		super(msg, 409, code);
	}
}

export class UserNotFoundError extends AuthError {
	constructor(message: string = 'User not found') {
		super(message, 404, 'AUTH_USER_NOT_FOUND');
	}
}

// TOKENS
export class TokenRequiredError extends AuthError {
	constructor(message: string = 'Authentication token required') {
		super(message, 401, 'AUTH_TOKEN_REQUIRED');
	}
}

export class TokenInvalidError extends AuthError {
	constructor(message: string = 'Invalid token') {
		super(message, 401, 'AUTH_TOKEN_INVALID');
	}
}

export class TokenExpiredError extends AuthError {
	constructor(type:string) {
		const msg = `${type} token has expired`;
		super(msg, 401, 'AUTH_TOKEN_EXPIRED');
	}
}

// SESSIONS
export class SessionNotFoundError extends AuthError {
	constructor(message: string = 'Session not found') {
		super(message, 401, 'AUTH_SESSION_NOT_FOUND');
	}
}

export class SessionExpiredError extends AuthError {
	constructor(message: string = 'Session has expired') {
		super(message, 401, 'AUTH_SESSION_EXPIRED');
	}
}

export class SessionRevokedError extends AuthError {
	constructor(message: string = 'Session has been revoked') {
		super(message, 401, 'AUTH_SESSION_REVOKED');
	}
}

// AUTHENTICATION
export class InvalidCredentialsError extends AuthError {
	constructor(message: string = 'Invalid username or password') {
		super(message, 401, 'AUTH_INVALID_CREDENTIALS');
	}
}
	// account locked, disabled, banned, verified

// AUTHORIZATION
	// RBAC

// 2FA

// PASSWORD RESET

// RATE LIMIT

