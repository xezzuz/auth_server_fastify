import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import AuthController from "../controllers/authController";
import UserController from "../controllers/userController";
import RelationsController from "../controllers/relationsContoller";
import RelationsRepository from "../repositories/relationsRepository";
import { userProfileSchema } from "../schemas/users.schema";
import Authenticate from "../middleware/Authenticate";

async function userRouter(fastify: FastifyInstance) {
	const userController: UserController = new UserController();
	const relationsController: RelationsController = new RelationsController();
	const relRepo: RelationsRepository = new RelationsRepository();

	fastify.decorate('authenticate', Authenticate); // auth middleware for protected routes
	fastify.decorate('requireAuth', { preHandler: fastify.authenticate }); // preHandler hook
	fastify.decorateRequest('user', null);

	// USER ROUTES /users
	fastify.get('/available', userController.UsernameEmailAvailable.bind(userController));
	fastify.post('/relations/request', relationsController.sendFriendRequest.bind(relationsController));
	fastify.delete('/relations/request', relationsController.cancelFriendRequest.bind(relationsController));
	fastify.post('/relations/accept', relationsController.acceptFriendRequest.bind(relationsController));
	fastify.post('/relations/block', relationsController.blockUser.bind(relationsController));
	fastify.delete('/relations/block', relationsController.unblockUser.bind(relationsController));
	fastify.delete('/relations/unfriend', relationsController.unfriend.bind(relationsController));

	fastify.delete('/relations', async () => {
		await relRepo.clean();
	});

	// fastify.get('/profile/me', {
	// 	schema: userProfileSchema,
	// 	preHandler: fastify.authenticate,
	// 	handler: userController.UserProfile.bind(userController)
	// });

	fastify.get('/profile/:username', {
		schema: userProfileSchema,
		preHandler: fastify.authenticate,
		handler: userController.UserProfileEndpoint.bind(userController)
	});

	fastify.get('/me', {
		preHandler: fastify.authenticate,
		handler: userController.Me.bind(userController)
	});

	// USER MANAGEMENT (admin or self-service)
	// GET /users — List users (admin only)
	// POST /users — Create user (admin creating users directly)
	// GET /users/:id — Get user by ID
	// PUT /users/:id — Full update of user info
	// PATCH /users/:id — Partial update of user info
	// DELETE /users/:id — Delete user

	// POST /reset-password/setup - Reset password (check if a account exists + send OTP to email)
	// POST /reset-password/verify - Check if OTP is valid
	// POST /reset-password/update - Update password

	// ACCOUNT MANAGEMENT (self-service)
	// GET /account — Get own profile (alias for /auth/me)
	// PATCH /account — Update own profile
	// DELETE /account — Delete own account (optional)
}

export default userRouter;