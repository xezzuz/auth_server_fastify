export abstract class AuthError extends Error {
	public readonly statusCode: number;
	public readonly errorCode: string;
	public readonly details: string;
	public readonly timestamp: string;

	constructor(message: string, statusCode: number, errorCode: string, details: any = {}) {
		super(message);
		this.statusCode = statusCode;
		this.errorCode = errorCode;
		this.details = details;
		this.timestamp = new Date().toISOString();
	}
}

// FORM (REGISTER)
export class FormError extends AuthError {
	constructor(message: string = 'Required fields are missing', details: any = {}) {
		super(message, 400, 'AUTH_FORM_INCOMPLETE', details);
	}
}

export class UsernameLengthError extends AuthError {
	constructor(message: string = 'Username must be between 4-20 characters') {
		super(message, 400, 'AUTH_USERNAME_LENGTH');
	}
}

export class PasswordLengthError extends AuthError {
	constructor(message: string = 'Password must be at least 8 characters') {
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

export class UserNotFoundError extends AuthError { // haven't used it yet
	constructor(message: string = 'User not found') {
		super(message, 404, 'AUTH_USER_NOT_FOUND');
	}
}

// TOKENS
export class TokenRequiredError extends AuthError {
	constructor(message: string = 'Authentication required', details: any = {}) {
		super(message, 401, 'AUTH_TOKEN_REQUIRED', details);
	}
}

export class TokenInvalidError extends AuthError {
	constructor(message: string = 'Invalid token', details: any = {}) {
		super(message, 401, 'AUTH_TOKEN_INVALID', details);
	}
}

export class TokenExpiredError extends AuthError {
	constructor(type:string, details: any = {}) {
		const msg = `${type} token has expired`;
		super(msg, 401, 'AUTH_TOKEN_EXPIRED', details);
	}
}

// SESSIONS
export class SessionNotFoundError extends AuthError {
	constructor(message: string = 'Session not found', details: any = {}) {
		super(message, 401, 'AUTH_SESSION_NOT_FOUND', details);
	}
}

export class SessionExpiredError extends AuthError {
	constructor(message: string = 'Session has expired', details: any = {}) {
		super(message, 401, 'AUTH_SESSION_EXPIRED', details);
	}
}

export class SessionRevokedError extends AuthError {
	constructor(message: string = 'Session has been revoked', details: any = {}) {
		super(message, 401, 'AUTH_SESSION_REVOKED', details);
	}
}

// AUTHENTICATION
export class InvalidCredentialsError extends AuthError {
	constructor(message: string = 'Invalid username or password', details: any = {}) {
		super(message, 401, 'AUTH_INVALID_CREDENTIALS', details);
	}
}
	// account locked, disabled, banned, verified

// AUTHORIZATION
	// RBAC

// 2FA

// PASSWORD RESET

// RATE LIMIT

