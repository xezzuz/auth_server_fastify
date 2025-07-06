import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import UserController from "../controllers/userController";
import StatsController from "../controllers/statsController";
import RelationsController from "../controllers/relationsContoller";
import RelationsRepository from "../repositories/relationsRepository";
import { matchesRequestSchema, relationsRequestSchema, statsRequestSchema, userProfileSchema, userUpdateSchema } from "../schemas/users.schema";
import Authenticate from "../middleware/Authenticate";

async function userRouter(fastify: FastifyInstance) {
	const userController: UserController = new UserController();
	const statsController: StatsController = new StatsController();
	const relationsController: RelationsController = new RelationsController();
	const relRepo: RelationsRepository = new RelationsRepository();

	fastify.decorate('authenticate', Authenticate); // auth middleware for protected routes
	fastify.decorate('requireAuth', { preHandler: fastify.authenticate }); // preHandler hook
	fastify.decorateRequest('user', null);

	// USER ROUTES /users
	fastify.get('/available', userController.UsernameEmailAvailable.bind(userController));

	// POST		/relations/:userID/request - SEND FRIEND REQUEST
	fastify.post('/relations/:user_id/request', {
		preHandler: fastify.authenticate,
		schema: relationsRequestSchema,
		handler: relationsController.sendFriendRequest.bind(relationsController)
	});
	// DELETE	/relations/:userID/request - CANCEL FRIEND REQUEST
	fastify.delete('/relations/:user_id/request', {
		preHandler: fastify.authenticate,
		schema: relationsRequestSchema,
		handler: relationsController.cancelFriendRequest.bind(relationsController)
	});
	// PUT		/relations/:userID/request - ACCEPT FRIEND REQUEST
	fastify.put('/relations/:user_id/request', {
		preHandler: fastify.authenticate,
		schema: relationsRequestSchema,
		handler: relationsController.acceptFriendRequest.bind(relationsController)
	});

	// PUT		/relations/:userID/unfriend - UNFRIEND
	fastify.put('/relations/:user_id/unfriend', {
		preHandler: fastify.authenticate,
		schema: relationsRequestSchema,
		handler: relationsController.unfriend.bind(relationsController)
	});

	// PUT		/relations/:userID/block - BLOCK
	fastify.put('/relations/:user_id/block', {
		preHandler: fastify.authenticate,
		schema: relationsRequestSchema,
		handler: relationsController.blockUser.bind(relationsController)
	});
	// PUT		/relations/:userID/unblock - UNBLOCK
	fastify.put('/relations/:user_id/unblock', {
		preHandler: fastify.authenticate,
		schema: relationsRequestSchema,
		handler: relationsController.unblockUser.bind(relationsController)
	});


	fastify.delete('/relations', async () => {
		await relRepo.clean();
	});

	// USER MANAGEMENT

	// GET /users/me
	fastify.get('/me', {
		preHandler: fastify.authenticate,
		handler: userController.MyProfileEndpoint.bind(userController)
	});

	// GET /users/:username
	fastify.get('/:username', {
		schema: userProfileSchema,
		preHandler: fastify.authenticate,
		handler: userController.UserProfileEndpoint.bind(userController)
	});
	
	// PUT /users/me
	// fastify.put('/me', {
	// 	schema: userUpdateSchema,
	// 	preHandler: fastify.authenticate,
	// 	handler: userController.UpdateMyProfileEndpoint.bind(userController)
	// });
	
	// DELETE /users/me
	// fastify.get('/profile/:username', {
	// 	schema: userProfileSchema,
	// 	preHandler: fastify.authenticate,
	// 	handler: userController.UserProfileEndpoint.bind(userController)
	// });

	// fastify.get('/me/stats', {
	// 	// schema: userUpdateSchema,
	// 	preHandler: fastify.authenticate,
	// 	handler: statsController.MyStats.bind(statsController)
	// });

	fastify.get('/:username/profile', {
		schema: statsRequestSchema,
		preHandler: fastify.authenticate,
		handler: statsController.UserProfile.bind(statsController)
	});

	fastify.get('/:username/performance', {
		schema: statsRequestSchema,
		preHandler: fastify.authenticate,
		handler: statsController.UserStats.bind(statsController)
	});

	fastify.get('/:username/games', {
		schema: matchesRequestSchema,
		preHandler: fastify.authenticate,
		handler: statsController.UserMatches.bind(statsController)
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