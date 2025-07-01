import RelationsRepository from "../repositories/relationsRepository";
import UserRepository from "../repositories/userRepository";
import { UserNotFoundError } from "../types/auth.types";

class UserService {
	private userRepository: UserRepository;
	private relationsRepository: RelationsRepository;

	constructor() {
		this.userRepository = new UserRepository();
		this.relationsRepository = new RelationsRepository();
	}
	
	async MyProfile(user_id: number) {
		console.log('fetchMe ID: ', user_id);
		const existingUser = await this.userRepository.findById(user_id);
		if (!existingUser)
			throw new UserNotFoundError();

		return existingUser;
	}

	async UserProfile(user_id: number, username: string) {
		const existingUser = await this.userRepository.findByUsername(username);
		if (!existingUser)
			throw new UserNotFoundError();

		const relation = await this.relationsRepository.findTwoWaysByUsers(user_id, existingUser.id);
		if (relation && relation.relation_status === 'BLOCKED')
			throw new UserNotFoundError();

		let friendship_status = 'NONE';
		if (relation && relation.relation_status === 'ACCEPTED')
			friendship_status = 'FRIENDS';
		if (relation && relation.relation_status === 'PENDING')
			friendship_status = (relation.requester_user_id === user_id) ? 'OUTGOING' : 'INCOMING';

		return {
			...existingUser,
			friendship_status
		};
	}

	async UpdateUserProfile(user_id: number, updates: any) {
		const existingUser = await this.userRepository.findById(user_id);
		if (!existingUser)
			throw new UserNotFoundError();

		const changes = await this.userRepository.update(user_id, updates);
		if (!changes)
			throw new UserNotFoundError();

		const newUser = await this.userRepository.findById(user_id);
		if (!newUser)
			throw new UserNotFoundError()
		return newUser;
	}
}

export default UserService;