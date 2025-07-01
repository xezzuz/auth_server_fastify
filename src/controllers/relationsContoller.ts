import { FastifyReply, FastifyRequest } from "fastify";
import RelationsService from "../services/relationsService";
import { IRelationsRequest } from "../types";

class RelationsController {
	private relationsService: RelationsService;

	constructor() {
		this.relationsService = new RelationsService();
	}

	async sendFriendRequest(request: FastifyRequest, reply: FastifyReply) {
		try {
			const { user_id: target_id } = request.params as IRelationsRequest;
			const user_id = request.user?.sub;

			const newRelation = await this.relationsService.sendFriendRequest(user_id!, parseInt(target_id));

			reply.status(201).send({ success: true, data: newRelation });
		} catch (err: any) {
			const { statusCode, errorCode } = err;
			reply.status(statusCode).send({ success: false, error: errorCode });
		}
	}

	async cancelFriendRequest(request: FastifyRequest, reply: FastifyReply) {
		try {
			const { user_id: target_id } = request.params as IRelationsRequest;
			const user_id = request.user?.sub;

			await this.relationsService.cancelFriendRequest(user_id!, parseInt(target_id));

			reply.status(204).send({ success: true, data: {} });
		} catch (err: any) {
			const { statusCode, errorCode } = err;
			reply.status(statusCode).send({ success: false, error: errorCode });
		}
	}

	async acceptFriendRequest(request: FastifyRequest, reply: FastifyReply) {
		try {
			const { user_id: target_id } = request.params as IRelationsRequest;
			const user_id = request.user?.sub;

			const newRelation = await this.relationsService.acceptFriendRequest(parseInt(target_id), user_id!);

			reply.status(200).send({ success: true, data: newRelation });
		} catch (err: any) {
			const { statusCode, errorCode } = err;
			reply.status(statusCode).send({ success: false, error: errorCode });
		}
	}

	async blockUser(request: FastifyRequest, reply: FastifyReply) {
		try {
			const { user_id: target_id } = request.params as IRelationsRequest;
			const user_id = request.user?.sub;

			const newRelation = await this.relationsService.blockUser(user_id!, parseInt(target_id));

			reply.status(200).send({ success: true, data: newRelation });
		} catch (err: any) {
			const { statusCode, errorCode } = err;
			reply.status(statusCode).send({ success: false, error: errorCode });
		}
	}

	async unblockUser(request: FastifyRequest, reply: FastifyReply) {
		try {
			const { user_id: target_id } = request.params as IRelationsRequest;
			const user_id = request.user?.sub;

			await this.relationsService.unblockUser(user_id!, parseInt(target_id));

			reply.status(200).send({ success: true, data: {} });
		} catch (err: any) {
			const { statusCode, errorCode } = err;
			reply.status(statusCode).send({ success: false, error: errorCode });
		}
	}

	async unfriend(request: FastifyRequest, reply: FastifyReply) {
		try {
			const { user_id: target_id } = request.params as IRelationsRequest;
			const user_id = request.user?.sub;

			await this.relationsService.unfriend(user_id!, parseInt(target_id));

			reply.status(200).send({ success: true, data: {} });
		} catch (err: any) {
			const { statusCode, errorCode } = err;
			reply.status(statusCode).send({ success: false, error: errorCode });
		}
	}
}

export default RelationsController;