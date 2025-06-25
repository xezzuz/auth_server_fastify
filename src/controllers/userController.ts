import { FastifyReply, FastifyRequest } from "fastify";
import UserService from "../services/userService";
import UserRepository from "../repositories/userRepository";

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

	// async EmailAvailable(request: FastifyRequest, reply: FastifyReply) {
	// 	try {
	// 		const { email } = request.body as { email: string };

	// 		const available = await this.userRepository.existsByEmail(email);
	// 		if (available) reply.status(200);
	// 		else reply.status(404);

	// 	} catch (err: any) {
	// 		reply.status(500).send({ success: false, data: {} })
	// 	}
	// }
}

export default UserController;