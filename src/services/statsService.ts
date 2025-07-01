import { db } from "../database";
import MatchesRepository from "../repositories/matchesRepository";
import UserRepository from "../repositories/userRepository";
import { InternalServerError, UserNotFoundError } from "../types/auth.types";

class StatsService {
	private userRepository: UserRepository;
	private matchesRepository: MatchesRepository;

	constructor() {
		this.userRepository = new UserRepository();
		this.matchesRepository = new MatchesRepository();
	}

	async getUserStats(user_id: number) {
		const existingUser = await this.userRepository.findById(user_id);
		if (!existingUser)
			throw new UserNotFoundError();

		// matchesStats(game_type, total_matches, wins, losses, draws, average_score)
		const matchesStats = await this.matchesRepository.getMatchesStatsByUserPerGameType(existingUser.id);
		if (!matchesStats)
			throw new InternalServerError();
		
		const userStats = await db.get(`SELECT * FROM users_stats WHERE user_id = ?`, [user_id]);
		if (!userStats)
			throw new InternalServerError();

		return {
			stats: userStats,
			games: matchesStats
		};
	}

	async getUserMatches(user_id: number, page: number) {
		const existingUser = await this.userRepository.findById(user_id);
		if (!existingUser)
			throw new UserNotFoundError();

		const matches = await this.matchesRepository.getMatchesPageByUser(user_id, page);
		if (matches)
			throw new InternalServerError();

		return matches;
	}
}

export default StatsService;