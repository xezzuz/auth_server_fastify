import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import AuthController from "../controllers/authController";

async function authRouter(fastify: FastifyInstance) {
	const authController: AuthController = new AuthController();

	// AUTH ROUTES
	fastify.post('/register', authController.RegisterEndpoint.bind(authController));
	fastify.post('/login', authController.LoginEndpoint.bind(authController));
	fastify.post('/logout', authController.LogoutEndpoint.bind(authController));
	fastify.get('/refresh', authController.RefreshEndpoint.bind(authController));
	// fastify.delete('/revoke-all', authController.RevokeAllRoute.bind(authController));
	fastify.get('/google/callback', authController.GoogleOAuthEndpoint.bind(authController));
	fastify.get('/42/callback', authController.IntraOAuthEndpoint.bind(authController));
	fastify.post('/2fa/setup', authController.TwoFactorSetupEndpoint.bind(authController));
	fastify.post('/2fa/confirm', authController.TwoFactorConfirmEndpoint.bind(authController));
	fastify.post('/2fa/verify', authController.TwoFactorVerifyEndpoint.bind(authController));
}

export default authRouter;