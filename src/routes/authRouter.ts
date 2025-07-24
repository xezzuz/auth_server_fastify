import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import AuthController from "../controllers/authController";
import Authenticate from "../middleware/Authenticate";
import { authLoginSchema, authLogoutSchema, authMFAVerifySchema, authOAuthSchema, authRefreshSchema, authRegisterSchema, authResetPasswordSchema, authResetPasswordUpdateSchema, authResetPasswordVerifySchema } from "../schemas/auth.schema";

import cookie from '@fastify/cookie';
import { db } from "../database";
import MFAController from "../controllers/mfaController";
import ResetController from "../controllers/resetController";

async function authRouter(fastify: FastifyInstance) {
	const authController: AuthController = new AuthController();
	const mfaController: MFAController = new MFAController();
	const resetController: ResetController = new ResetController();

	fastify.decorate('authenticate', Authenticate); // auth middleware for protected routes
	fastify.decorate('requireAuth', { preHandler: fastify.authenticate }); // preHandler hook
	fastify.decorateRequest('user', null);
	fastify.register(cookie);

	/*-------------------------------- Local Authentication --------------------------------*/
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


	/*-------------------------------- Remote Authentication --------------------------------*/
	fastify.get('/google/callback', {
		schema: authOAuthSchema,
		handler: authController.GoogleOAuthEndpoint.bind(authController)
	});
	fastify.get('/42/callback', {
		schema: authOAuthSchema,
		handler: authController.IntraOAuthEndpoint.bind(authController)
	});


	/*----------------------------- Multi-Factor Authentication -----------------------------*/
	fastify.post('/mfa/totp/setup/init', {
		// schema: auth2FASetupSchema,
		preHandler: fastify.authenticate,
		handler: mfaController.TOTPSetupInitEndpoint.bind(mfaController)
	});
	fastify.post('/mfa/totp/setup/verify', {
		schema: authMFAVerifySchema,
		preHandler: fastify.authenticate,
		handler: mfaController.TOTPSetupVerifyEndpoint.bind(mfaController)
	});

	fastify.post('/mfa/email/setup/init', {
		// schema: auth2FASetupSchema,
		preHandler: fastify.authenticate,
		handler: mfaController.EmailOTPSetupInitEndpoint.bind(mfaController)
	});
	fastify.post('/mfa/email/setup/verify', {
		// schema: auth2FASetupSchema,
		preHandler: fastify.authenticate,
		handler: mfaController.EmailOTPSetupVerifyEndpoint.bind(mfaController)
	});

	fastify.post('/mfa/sms/setup/init', {
		// schema: auth2FASetupSchema,
		preHandler: fastify.authenticate,
		handler: mfaController.SMSOTPSetupInitEndpoint.bind(mfaController)
	});
	fastify.post('/mfa/sms/setup/verify', {
		// schema: auth2FASetupSchema,
		preHandler: fastify.authenticate,
		handler: mfaController.SMSOTPSetupVerifyEndpoint.bind(mfaController)
	});

	// fastify.post('/2fa/confirm', {
	// 	schema: auth2FAConfirmSchema,
	// 	preHandler: fastify.authenticate,
	// 	handler: mfaController.TwoFactorConfirmEndpoint.bind(mfaController)
	// });
	// fastify.post('/2fa/verify', {
	// 	schema: auth2FAVerifySchema,
	// 	preHandler: fastify.authenticate,
	// 	handler: mfaController.TwoFactorVerifyEndpoint.bind(mfaController)
	// });
	// fastify.post('/2fa/disable', {
	// 	schema: auth2FADisableSchema,
	// 	preHandler: fastify.authenticate,
	// 	handler: mfaController.TwoFactorVerifyEndpoint.bind(mfaController)
	// });
	

	/*------------------------------------ Reset Password ------------------------------------*/
	fastify.post('/reset/setup', {
		schema: authResetPasswordSchema,
		handler: resetController.ResetPasswordSetupEndpoint.bind(resetController)
	});
	fastify.post('/reset/verify', {
		schema: authResetPasswordVerifySchema,
		handler: resetController.ResetPasswordVerifyEndpoint.bind(resetController)
	});
	fastify.post('/reset/update', {
		schema: authResetPasswordUpdateSchema,
		handler: resetController.ResetPasswordUpdateEndpoint.bind(resetController)
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
	fastify.get('/db', async () => {
		const getResult = await db.get(`SELECT * FROM users WHERE username = ?`, ['xezzuz']);
		const getResult_2 = await db.get(`SELECT * FROM users WHERE username = ?`, ['doesntexist']);

		const all_1 = await db.all(`SELECT * FROM users WHERE username = ?`, ['xezzuz']);
		const all_2 = await db.all(`SELECT * FROM users WHERE username = ?`, ['doesntexist']);
		const all_3 = await db.all(`SELECT * FROM users`);

		console.log('getting something that exists: ', getResult);
		console.log('getting something that doesnt exists: ', getResult_2);

		console.log('getting all that exists (one match): ', all_1);
		console.log('getting all that doesnt exists (no match): ', all_2);
		console.log('getting all that exists (multiple matches): ', all_3);
	});

	fastify.get('/run-sql', async () => {
		// await db.run(`DROP TABLE matches`);
		const result = await db.run(`INSERT INTO matches 
		(player_home_score, player_away_score, game_type, started_at, finished_at, player_home_id, player_away_id) 
		VALUES
		-- within last 7 days
		(21, 18, 'PING PONG', datetime('now', '-1 day'), datetime('now', '-1 day', '+30 minutes'), 8, 2),
		(15, 21, 'TICTACTOE', datetime('now', '-3 days'), datetime('now', '-3 days', '+5 minutes'), 3, 8),
		
		-- within last 30 but older than 7
		(11, 21, 'PING PONG', datetime('now', '-10 days'), datetime('now', '-10 days', '+20 minutes'), 2, 8),
		(21, 19, 'TICTACTOE', datetime('now', '-20 days'), datetime('now', '-20 days', '+3 minutes'), 4, 8),
		
		-- older than 30
		(21, 14, 'PING PONG', datetime('now', '-40 days'), datetime('now', '-40 days', '+25 minutes'), 8, 3),
		(17, 21, 'TICTACTOE', datetime('now', '-60 days'), datetime('now', '-60 days', '+4 minutes'), 8, 4);`);
		console.log(result);
	});
}

export default authRouter;