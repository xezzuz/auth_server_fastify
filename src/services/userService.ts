import RelationsRepository from "../repositories/relationsRepository";
import UserRepository from "../repositories/userRepository";

class UserService {
	private userRepository: UserRepository;
	private relationsRepository: RelationsRepository;

	constructor() {
		this.userRepository = new UserRepository();
		this.relationsRepository = new RelationsRepository();
	}

	async UserProfile(user_id: number, username: string) {
		const exists = await this.userRepository.findByUsername(username);
		if (!exists)
			return null;

		const relation = await this.relationsRepository.findTwoWaysByUsers(user_id, exists.id);
		if (relation && relation.relation_status === 'BLOCKED')
			return null;

		let status = 'NONE';

		if (relation && relation.relation_status === 'ACCEPTED')
			status = 'FRIENDS';
		if (relation && relation.relation_status === 'PENDING')
			status = (relation.requester_user_id === user_id) ? 'OUTGOING' : 'INCOMING';

		return {
			...exists,
			friendship: status
		};
	}

	async MeProfile(user_id: number) {
		console.log('fetchMe ID: ', user_id);
		const exists = await this.userRepository.findById(user_id);
		if (!exists)
			return null;
		return exists;

		// const relation = await this.relationsRepository.findTwoWaysByUsers(user_id, exists.id);
		// if (relation && relation.relation_status === 'BLOCKED')
		// 	return null;

		// let status = 'NONE';

		// if (relation && relation.relation_status === 'ACCEPTED')
		// 	status = 'FRIENDS';
		// if (relation && relation.relation_status === 'PENDING')
		// 	status = (relation.requester_user_id === user_id) ? 'OUTGOING' : 'INCOMING';

		// return {
		// 	...exists,
		// 	friendship: status
		// };
	}
}

export default UserService;