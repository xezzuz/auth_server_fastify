import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import AuthController from "../controllers/authController";
import UserController from "../controllers/userController";
import RelationsController from "../controllers/relationsContoller";
import RelationsRepository from "../repositories/relationsRepository";

async function userRouter(fastify: FastifyInstance) {
	const userController: UserController = new UserController();
	const relationsController: RelationsController = new RelationsController();
	const relRepo: RelationsRepository = new RelationsRepository();

	// USER ROUTES
	fastify.get('/users/available', userController.UsernameEmailAvailable.bind(userController));
	fastify.post('/relations/request', relationsController.sendFriendRequest.bind(relationsController));
	fastify.delete('/relations/request', relationsController.cancelFriendRequest.bind(relationsController));
	fastify.post('/relations/accept', relationsController.acceptFriendRequest.bind(relationsController));
	fastify.post('/relations/block', relationsController.blockUser.bind(relationsController));
	fastify.delete('/relations/block', relationsController.unblockUser.bind(relationsController));
	fastify.delete('/relations/unfriend', relationsController.unfriend.bind(relationsController));

	fastify.delete('/relations', async () => {
		await relRepo.clean();
	});

	// USER MANAGEMENT (admin or self-service)
	// GET /users — List users (admin only)
	// POST /users — Create user (admin creating users directly)
	// GET /users/:id — Get user by ID
	// PUT /users/:id — Full update of user info
	// PATCH /users/:id — Partial update of user info
	// DELETE /users/:id — Delete user

	// ACCOUNT MANAGEMENT (self-service)
	// GET /account — Get own profile (alias for /auth/me)
	// PATCH /account — Update own profile
	// DELETE /account — Delete own account (optional)
}

export default userRouter;