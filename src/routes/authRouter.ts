import { FastifyInstance } from "fastify";
import AuthController from "../controllers/authController";

async function authRouter(fastify: FastifyInstance) {
	const authController: AuthController = new AuthController();

	// AUTH ROUTES
	fastify.post('/register', authController.RegisterEndpoint.bind(authController));
	fastify.post('/login', authController.LoginEndpoint.bind(authController));
	fastify.post('/logout', authController.LogoutEndpoint.bind(authController));
	fastify.get('/refresh', authController.RefreshEndpoint.bind(authController));
	// fastify.delete('/revoke-all', authController.RevokeAllRoute.bind(authController));
}

export default authRouter;