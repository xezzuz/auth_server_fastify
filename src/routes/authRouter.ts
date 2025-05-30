import { FastifyInstance } from "fastify";
import AuthController from "../controllers/authController";

async function authRouter(fastify: FastifyInstance) {
	const authController: AuthController = new AuthController();

	// AUTH ROUTES
	fastify.post('/register', authController.RegisterRoute.bind(authController));
	fastify.post('/login', authController.LoginRoute.bind(authController));
	fastify.get('/refresh', authController.RefreshRoute.bind(authController));
	fastify.delete('/revoke-all', authController.RevokeAllRoute.bind(authController));
}

export default authRouter;