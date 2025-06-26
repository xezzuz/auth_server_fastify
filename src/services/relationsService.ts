import RelationsRepository from "../repositories/relationsRepository";

class RelationsService {
	private relationsRepository: RelationsRepository;

	constructor() {
		this.relationsRepository = new RelationsRepository();
	}

	async sendFriendRequest(sender_id: number, receiver_id: number) {
		const existingTwoWayRelation = await this.relationsRepository.findTwoWaysByUsers(
			sender_id,
			receiver_id
		);

		if (existingTwoWayRelation) {
			if (existingTwoWayRelation.relation_status === 'BLOCKED')
				throw new Error('UNABLE TO SEND FRIEND REQUEST (BLOCKED)');
			if (existingTwoWayRelation.relation_status === 'PENDING')
				throw new Error('FRIEND REQUEST ALREADY SENT');
			if (existingTwoWayRelation.relation_status === 'ACCEPTED')
				throw new Error('ALREADY FRIENDS');
			else
				throw new Error('AN UNEXPECTED ERROR OCCURED');
		}
		
		const newRelation = await this.relationsRepository.create(sender_id, receiver_id, 'PENDING');
		return newRelation;
		// switch (existingRelation.relation_status) {
		// 	case 'BLOCKED':
		// 		throw new Error('UNABLE TO SEND FRIEND REQUEST (BLOCKED)');
		// 	case 'PENDING':
		// 		throw new Error('FRIEND REQUEST ALREADY SENT');
		// 	case 'ACCEPTED':
		// 		throw new Error('ALREADY FRIENDS');
		// 	default:
		// 		throw new Error('AN UNEXPECTED ERROR OCCURED');
		// }
	}

	async cancelFriendRequest(sender_id: number, receiver_id: number) {
		const existingTwoWayRelation = await this.relationsRepository.findTwoWaysByUsers(
			sender_id,
			receiver_id
		);

		if (!existingTwoWayRelation || existingTwoWayRelation.relation_status !== 'PENDING')
			throw new Error('NO PENDING REQUEST TO THIS USER TO CANCEL');
		
		if (existingTwoWayRelation.requester_user_id !== sender_id)
			throw new Error('ONLY THE SENDER CAN CANCEL REQUEST');
		
		await this.relationsRepository.deleteRelationById(existingTwoWayRelation.id);
	}
		
	async acceptFriendRequest(current_user_id: number, requester_id: number) {
		const existingTwoWayRelation = await this.relationsRepository.findTwoWaysByUsers(
			current_user_id,
			requester_id
		);

		if (!existingTwoWayRelation || existingTwoWayRelation.relation_status !== 'PENDING')
			throw new Error('NO PENDING REQUEST FROM THIS USER TO ACCEPT');
		console.log('accept request');
		console.log(existingTwoWayRelation);
		if (existingTwoWayRelation.requester_user_id === current_user_id)
			throw new Error('ONLY THE RECEIVER CAN ACCEPT REQUEST');

		const newRelation = await this.relationsRepository.updateRelationStatus(
			existingTwoWayRelation.id,
			'ACCEPTED'
		);
		if (newRelation)
			return newRelation;

		throw new Error('AN UNEXPECTED ERROR OCCURED');
	}
	
	async blockUser(blocker_id: number, blocked_id: number) {
		const existingTwoWayRelation = await this.relationsRepository.findTwoWaysByUsers(
			blocker_id,
			blocked_id
		);

		if (existingTwoWayRelation && existingTwoWayRelation.relation_status === 'BLOCKED' && existingTwoWayRelation.requester_user_id === blocker_id)
			throw new Error('UNABLE TO BLOCK (ALREADY BLOCKED)');
		if (existingTwoWayRelation && existingTwoWayRelation.relation_status === 'BLOCKED' && existingTwoWayRelation.receiver_user_id === blocker_id)
			throw new Error('UNABLE TO BLOCK (HE ALREADY BLOCKED YOU)');

		await this.relationsRepository.deleteRelationById(existingTwoWayRelation.id);
		const newRelation = await this.relationsRepository.create(
			blocker_id,
			blocked_id,
			'BLOCKED'
		);
		return newRelation;
	}

	async unblockUser(unblocker_id: number, unblocked_id: number) {
		const existingOneWayRelation = await this.relationsRepository.findOneWayByUsers(
			unblocker_id,
			unblocked_id
		);

		if (!existingOneWayRelation || existingOneWayRelation.relation_status !== 'BLOCKED')
			throw new Error('UNABLE TO UNBLOCK (NOT BLOCKED)');
		
		await this.relationsRepository.deleteRelationById(existingOneWayRelation.id);
	}
	
	async unfriend(user_id: number, to_unfriend: number) {
		const existingTwoWayRelation = await this.relationsRepository.findTwoWaysByUsers(
			user_id,
			to_unfriend
		);
		
		if (!existingTwoWayRelation || existingTwoWayRelation.relation_status !== 'ACCEPTED')
			throw new Error('UNABLE TO UNFRIEND (NOT FRIENDS)');
		
		await this.relationsRepository.deleteRelationById(existingTwoWayRelation.id);
	}
}

export default RelationsService;