import UserRepository from "../repositories/userRepository";

class UserService {
	private userRepository: UserRepository;

	constructor() {
		this.userRepository = new UserRepository();
	}
}

export default UserService;