import { FastifyReply, FastifyRequest } from "fastify";
import UserService from "../services/userService";
import UserRepository from "../repositories/userRepository";
import { IProfileRequest } from "../types";
import { AuthError, UserNotFoundError } from "../types/auth.types";

class UserController {
	private userService: UserService;
	private userRepository: UserRepository;

	constructor() {
		this.userService = new UserService();
		this.userRepository = new UserRepository();
	}

	async UsernameEmailAvailable(request: FastifyRequest, reply: FastifyReply) {
		try {
			const { username, email } = request.query as { username?: string, email?: string };

			if (!username && !email) {
				reply.status(400).send({ success: false, data: {} });
				return ;
			}

			let isTaken: boolean;

			if (username && !email)
				isTaken = await this.userRepository.existsByUsername(username);
			else if (email && !username)
				isTaken = await this.userRepository.existsByEmail(email);
			else
				isTaken = await this.userRepository.exists(username!, email!);

			reply.status(isTaken ? 404 : 200).send({ success: true, available: !isTaken });

		} catch (err: any) {
			reply.status(500).send({ success: false, data: {} })
		}
	}
	
	async MyProfileEndpoint(request: FastifyRequest, reply: FastifyReply) {
		console.log('request auth injected: ', request.user);
		try {
			const user_id = request.user?.sub;

			const user = await this.userService.MyProfile(user_id!);

			reply.status(200).send({ success: true, data: user });
		} catch (err: any) {
			const { statusCode, errorCode } = err;
			reply.status(statusCode).send({ success: false, error: errorCode });
		}
	}

	async UserProfileEndpoint(request: FastifyRequest, reply: FastifyReply) {
		try {
			const { username } = request.params as IProfileRequest;
			const user_id = request.user?.sub;

			const userAndFriendshipStatus = await this.userService.UserProfile(user_id!, username);

			reply.status(200).send({ success: true, data: userAndFriendshipStatus });
		} catch (err: any) {
			const { statusCode, errorCode } = err;
			reply.status(statusCode).send({ success: false, error: errorCode });
		}
	}

	async UpdateMyProfileEndpoint(request: FastifyRequest, reply: FastifyReply) {
		try {
			const user_id = request.user?.sub;
			const updates = request.body;

			const newUser = await this.userService.UpdateUserProfile(user_id!, updates);

			reply.status(200).send({ success: true, data: newUser });
		} catch (err: any) {
			const { statusCode, errorCode } = err;
			reply.status(statusCode).send({ success: false, error: errorCode });
		}
	}

	// DELETE USER
}

export default UserController;