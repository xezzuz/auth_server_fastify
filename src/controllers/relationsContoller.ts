import { FastifyReply, FastifyRequest } from "fastify";
import RelationsService from "../services/relationsService";

class RelationsController {
	private relationsService: RelationsService;

	constructor() {
		this.relationsService = new RelationsService();
	}

	async sendFriendRequest(request: FastifyRequest, reply: FastifyReply) {
		const { user_id, target } = request.body as { user_id: string, target: string };

		try {
			const result = await this.relationsService.sendFriendRequest(parseInt(user_id), parseInt(target));

			reply.status(200).send({ success: true, data: result });
		} catch (err: any) {
			console.log(err);
			reply.status(400).send({ success: false, err });
		}
	}

	async cancelFriendRequest(request: FastifyRequest, reply: FastifyReply) {
		const { user_id, target } = request.body as { user_id: string, target: string };

		try {
			const result = await this.relationsService.cancelFriendRequest(parseInt(user_id), parseInt(target));

			reply.status(200).send({ success: true, data: result });
		} catch (err: any) {
			console.log(err);
			reply.status(400).send({ success: false, err });
		}
	}

	async acceptFriendRequest(request: FastifyRequest, reply: FastifyReply) {
		const { user_id, target } = request.body as { user_id: string, target: string };

		try {
			const result = await this.relationsService.acceptFriendRequest(parseInt(user_id), parseInt(target));

			reply.status(200).send({ success: true, data: result });
		} catch (err: any) {
			console.log(err);
			reply.status(400).send({ success: false, err });
		}
	}

	async blockUser(request: FastifyRequest, reply: FastifyReply) {
		const { user_id, target } = request.body as { user_id: string, target: string };

		try {
			const result = await this.relationsService.blockUser(parseInt(user_id), parseInt(target));

			reply.status(200).send({ success: true, data: result });
		} catch (err: any) {
			console.log(err);
			reply.status(400).send({ success: false, err });
		}
	}

	async unblockUser(request: FastifyRequest, reply: FastifyReply) {
		const { user_id, target } = request.body as { user_id: string, target: string };

		try {
			const result = await this.relationsService.unblockUser(parseInt(user_id), parseInt(target));

			reply.status(200).send({ success: true, data: result });
		} catch (err: any) {
			console.log(err);
			reply.status(400).send({ success: false, err });
		}
	}

	async unfriend(request: FastifyRequest, reply: FastifyReply) {
		const { user_id, target } = request.body as { user_id: string, target: string };

		try {
			const result = await this.relationsService.unfriend(parseInt(user_id), parseInt(target));

			reply.status(200).send({ success: true, data: result });
		} catch (err: any) {
			console.log(err);
			reply.status(400).send({ success: false, err });
		}
	}
}

export default RelationsController;