import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import AuthController from "../controllers/authController";
import Authenticate from "../middleware/Authenticate";
import { auth2FAConfirmSchema, auth2FADisableSchema, auth2FASetupSchema, auth2FAVerifySchema, authLoginSchema, authLogoutSchema, authOAuthSchema, authRefreshSchema, authRegisterSchema } from "../schemas/auth.schema";

async function authRouter(fastify: FastifyInstance) {
	const authController: AuthController = new AuthController();

	fastify.decorate('authenticate', Authenticate); // auth middleware for protected routes
	fastify.decorate('requireAuth', { preHandler: fastify.authenticate }); // preHandler hook
	fastify.decorateRequest('user', null);

	// AUTH ROUTES
	fastify.post('/register', {
		schema: authRegisterSchema,
		handler: authController.RegisterEndpoint.bind(authController)
	});

	fastify.post('/login', {
		schema: authLoginSchema,
		handler: authController.LoginEndpoint.bind(authController)
	});

	fastify.post('/logout', {
		schema: authLogoutSchema,
		preHandler: fastify.authenticate,
		handler: authController.LogoutEndpoint.bind(authController)
	});

	fastify.get('/refresh', {
		schema: authRefreshSchema,
		handler: authController.RefreshEndpoint.bind(authController)
	});

	// REMOTE AUTH (GOOGLE + 42_INTRA)
	fastify.get('/google/callback', {
		schema: authOAuthSchema,
		handler: authController.GoogleOAuthEndpoint.bind(authController)
	});
	fastify.get('/42/callback', {
		schema: authOAuthSchema,
		handler: authController.IntraOAuthEndpoint.bind(authController)
	});

	// 2FA (OTP / TOTP)
	fastify.post('/2fa/setup', {
		schema: auth2FASetupSchema,
		preHandler: fastify.authenticate,
		handler: authController.TwoFactorSetupEndpoint.bind(authController)
	});
	fastify.post('/2fa/confirm', {
		schema: auth2FAConfirmSchema,
		preHandler: fastify.authenticate,
		handler: authController.TwoFactorConfirmEndpoint.bind(authController)
	});
	fastify.post('/2fa/verify', {
		schema: auth2FAVerifySchema,
		preHandler: fastify.authenticate,
		handler: authController.TwoFactorVerifyEndpoint.bind(authController)
	});

	fastify.post('/2fa/disable', {
		schema: auth2FADisableSchema,
		preHandler: fastify.authenticate,
		handler: authController.TwoFactorVerifyEndpoint.bind(authController)
	});

	// fastify.delete('/revoke-all', authController.RevokeAllRoute.bind(authController));

	// SESSION / DEVICE MANAGEMENT
	// GET /auth/sessions — List active sessions/devices
	// DELETE /auth/sessions/:id — Revoke a specific session
	// DELETE /auth/sessions — Revoke all sessions except current

	// PASSWORD MANAGEMENT
	// POST /auth/forgot-password — Send password reset link
	// POST /auth/reset-password — Reset password with token
	// POST /auth/change-password — Authenticated user changes own password

	// EMAIL VERIFICATION (optional)
	// POST /auth/verify-email — Trigger email verification
	// GET /auth/verify-email/:token — Confirm email with token
}

export default authRouter;