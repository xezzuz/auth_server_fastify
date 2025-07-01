import { db } from "../database";
import { InternalServerError } from "../types/auth.types";

class MatchesRepository {
	async create(
		player_home_score: number,
		player_away_score: number,
		game_type: string,
		player_home_id: number,
		player_away_id: number,
		started?: string,
		finished?: string
	) : Promise<number> {
		const startedVal = started ?? new Date().toISOString();
		const finishedVal = finished ?? new Date().toISOString();

		try {
			const runResult = await db.run(
				`INSERT INTO matches 
				(player_home_score, player_away_score, game_type, started, finished, player_home_id, player_away_id) 
				VALUES (?, ?, ?, ?, ?, ?, ?)`,
				[player_home_score, player_away_score, game_type, startedVal, finishedVal, player_home_id, player_away_id]
			);
			return runResult.lastID;
		} catch (err: any) {
			console.error('SQLite Error: ', err);
			throw new InternalServerError();
		}
	}

	async getAllMatchesByUser(user_id: number) : Promise<any | null> {
		try {
			const results = await db.all(
				`SELECT * FROM matches WHERE player_home_id = ? OR player_away_id = ?`,
				[user_id, user_id]
			);
			return results;
		} catch (err: any) {
			console.error('SQLite Error: ', err);
			throw new InternalServerError();
		}
	}

	async getMatchesPageByUser(user_id: number, page: number) : Promise<any | null> {
		const offset = (page - 1) * 5;
		try {
			const results = await db.all(
				`SELECT * FROM matches WHERE player_home_id = ? OR player_away_id = ?
					ORDER BY started_at DESC
						LIMIT 5 OFFSET ?`,
				[user_id, user_id, offset]
			);
			return results;
		} catch (err: any) {
			console.error('SQLite Error: ', err);
			throw new InternalServerError();
		}
	}

	async getTotalMatchesByUser(user_id: number): Promise<number> {
		try {
			const result = await db.get(
				`SELECT COUNT(*) as count FROM matches WHERE player_home_id = ? OR player_away_id = ?`,
				[user_id, user_id]
			);
			return result?.count ?? 0;
		} catch (err: any) {
			console.error('SQLite Error: ', err);
			throw new InternalServerError();
		}
	}

	async getTotalWinsByUser(user_id: number): Promise<number> {
		try {
			const result = await db.get(
				`SELECT COUNT(*) as count FROM matches
				 WHERE (player_home_id = ? AND player_home_score > player_away_score)
				 OR (player_away_id = ? AND player_away_score > player_home_score)`,
				[user_id, user_id]
			);
			return result?.count ?? 0;
		} catch (err: any) {
			console.error('SQLite Error: ', err);
			throw new InternalServerError();
		}
	}

	async getTotalLossesByUser(user_id: number): Promise<number> {
		try {
			const result = await db.get(
				`SELECT COUNT(*) as count FROM matches
				 WHERE (player_home_id = ? AND player_home_score < player_away_score)
				 OR (player_away_id = ? AND player_away_score < player_home_score)`,
				[user_id, user_id]
			);
			return result?.count ?? 0;
		} catch (err: any) {
			console.error('SQLite Error: ', err);
			throw new InternalServerError();
		}
	}

	async getTotalDrawsByUser(user_id: number): Promise<number> {
		try {
			const result = await db.get(
				`SELECT COUNT(*) as count FROM matches
				 WHERE (player_home_id = ? OR player_away_id = ?) AND player_home_score = player_away_score`,
				[user_id, user_id]
			);
			return result?.count ?? 0;
		} catch (err: any) {
			console.error('SQLite Error: ', err);
			throw new InternalServerError();
		}
	}

	async getAverageScoreByUser(user_id: number): Promise<number> {
		try {
			const result = await db.get(
				`SELECT AVG(
					CASE 
						WHEN player_home_id = ? THEN player_home_score
						WHEN player_away_id = ? THEN player_away_score
					END
				) AS average_score FROM matches WHERE player_home_id = ? OR player_away_id = ?`,
				[user_id, user_id, user_id, user_id]
			);
			return result?.avg_score ?? 0;
		} catch (err: any) {
			console.error('SQLite Error: ', err);
			throw new InternalServerError();
		}
	}

	async getMatchesStatsByUserPerGameType(user_id: number) : Promise<any> {
		try {
			const results = await db.all(
				`SELECT
					game_type,
					COUNT(*) AS total_matches,
					SUM(

						CASE
							WHEN (player_home_id = ? AND player_home_score > player_away_score)
							OR (player_away_id = ? AND player_away_score > player_home_score)
							THEN 1 ELSE 0
						END

					) AS wins,
					SUM(

						CASE
							WHEN (player_home_id = ? AND player_home_score < player_away_score)
							OR (player_away_id = ? AND player_away_score < player_home_score)
							THEN 1 ELSE 0
						END

					) AS losses,
					SUM(

						CASE
							WHEN (player_home_id = ? AND player_home_score = player_away_score)
							OR (player_away_id = ? AND player_away_score = player_home_score)
							THEN 1 ELSE 0
						END

					) AS draws,
					AVG(

						CASE
							WHEN (player_home_id = ?) THEN player_home_score
							WHEN (player_away_id = ?) THEN player_away_score
						END

					) AS average_score
				FROM matches
				WHERE (player_home_id = ?) OR (player_away_id = ?)
				GROUP BY game_type`,
				[user_id, user_id, user_id, user_id, user_id, user_id, user_id, user_id, user_id, user_id]
			); // i need to add total playtime + avg game playtime
			return results;
		} catch (err: any) {
			console.error('SQLite Error: ', err);
			throw new InternalServerError();
		}
	}

	// async getMatchesByUserPerGameType(user_id: number): Promise<{ game_type: string; total_matches: number }[]> {
	// 	try {
	// 		const results = await db.all<{ game_type: string; total_matches: number }>(
	// 			`SELECT game_type, COUNT(*) AS total_matches
	// 			FROM matches
	// 			WHERE player_home_id = ? OR player_away_id = ?
	// 			GROUP BY game_type`,
	// 			[user_id, user_id]
	// 		);
	// 		return results;
	// 	} catch (err: any) {
	// 		console.error('SQLite Error: ', err);
	// 		throw new InternalServerError();
	// 	}
	// }
}

export default MatchesRepository;