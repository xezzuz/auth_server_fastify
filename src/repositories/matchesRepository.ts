import { db } from "../database";
import { InternalServerError } from "../types/auth.types";

class MatchesRepository {
	private SQLCTE = `
		WITH user_matches AS (
			SELECT
				m.id AS match_id,
				m.started_at,
				m.finished_at,
				CASE WHEN m.player_home_id = ? THEN m.player_home_score ELSE m.player_away_score END AS user_score,
				CASE WHEN m.player_home_id = ? THEN m.player_away_score ELSE m.player_home_score END AS opp_score,
				CASE WHEN m.player_home_id = ? THEN m.player_away_id ELSE m.player_home_id END AS opponent_id,
				(strftime('%s', m.finished_at) - strftime('%s', m.started_at)) AS duration,
				CASE
					WHEN (m.player_home_id = ? AND m.player_home_score > m.player_away_score) 
					OR (m.player_away_id = ? AND m.player_away_score > m.player_home_score) THEN 'W'
					WHEN (m.player_home_id = ? AND m.player_home_score < m.player_away_score) 
					OR (m.player_away_id = ? AND m.player_away_score < m.player_home_score) THEN 'L'
					ELSE 'D'
				END AS outcome,
				u.username AS opponent_username
			FROM matches m
			JOIN users u
			ON u.id = 
					CASE
						WHEN m.player_home_id = ? THEN m.player_away_id
						ELSE m.player_home_id
					END
			WHERE m.player_home_id = ? OR m.player_away_id = ?
		)
		CREATE TEMP TABLE tmp_user_matches AS SELECT * FROM user_matches
	`;

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

	async getMatchesPageByUser_(user_id: number, page: number) : Promise<any | null> {
		const offset = (page - 1) * 5;
		try {
			const results = await db.all(`
				SELECT	uh.username AS player_home_username,
						uh.avatar_url AS player_home_avatar,
						ua.username AS player_away_username,
						ua.avatar_url AS player_away_avatar,
						m.*
					FROM matches m
				JOIN users uh ON (m.player_home_id = uh.id)
				JOIN users ua ON (m.player_away_id = ua.id)
				WHERE (m.player_home_id = ? OR m.player_away_id = ?)`,
				[user_id, user_id]
			);
			return results;
		} catch (err: any) {
			console.error('SQLite Error: ', err);
			throw new InternalServerError();
		}
	}

	async getUserStats(user_id: number) : Promise<any | null> {
		try {
			const CTEResult = `match_id	started_at	finished_at	user_score	opp_score	opponent_id	opponent_username	duration	outcome`;

			await db.run(this.SQLCTE, [user_id, user_id, user_id, user_id, user_id, user_id, user_id, user_id, user_id, user_id]);

			// matches | wins | losses | draws | win_rate
			// total/max/min/avg user score | total/max/min/avg opp score
			// avg user score by outcome | avg opp score by outcome | avg duration by outcome

			const stats = await db.get(`
				SELECT 
					COUNT(*) AS matches,

					SUM(CASE WHEN outcome = 'W' THEN 1 ELSE 0 END) AS wins,
					SUM(CASE WHEN outcome = 'L' THEN 1 ELSE 0 END) AS losses,
					SUM(CASE WHEN outcome = 'D' THEN 1 ELSE 0 END) AS draws,

					100.00 * SUM(CASE WHEN outcome = 'W' THEN 1 ELSE 0 END) / COUNT(*) AS win_rate,

					SUM(user_score) AS total_user_score,
					MAX(user_score) AS max_user_score,
					MIN(user_score) AS min_user_score,
					AVG(user_score) AS avg_user_score,

					AVG(CASE WHEN outcome = 'W' THEN user_score ELSE NULL END) AS avg_user_win_score,
					AVG(CASE WHEN outcome = 'L' THEN user_score ELSE NULL END) AS avg_user_loss_score,
					AVG(CASE WHEN outcome = 'D' THEN user_score ELSE NULL END) AS avg_user_draw_score,
					
					SUM(opp_score) AS total_opp_score,
					MAX(opp_score) AS max_opp_score,
					MIN(opp_score) AS min_opp_score,
					AVG(opp_score) AS avg_opp_score,
					
					AVG(CASE WHEN outcome = 'W' THEN user_score ELSE NULL END) AS avg_opp_win_score,
					AVG(CASE WHEN outcome = 'L' THEN user_score ELSE NULL END) AS avg_opp_loss_score,
					AVG(CASE WHEN outcome = 'D' THEN user_score ELSE NULL END) AS avg_opp_draw_score,

					SUM(duration) AS total_duration,
					MAX(duration) AS max_duration,
					MIN(duration) AS min_duration,
					AVG(duration) AS avg_duration,

					AVG(CASE WHEN outcome = 'W' THEN duration ELSE NULL END) AS avg_user_win_duration,
					AVG(CASE WHEN outcome = 'L' THEN duration ELSE NULL END) AS avg_user_loss_duration,
					AVG(CASE WHEN outcome = 'D' THEN duration ELSE NULL END) AS avg_user_draw_duration
				FROM tmp_user_matches
			`);

			const uniqueOpponents = await db.get(`
				SELECT
					COUNT(DISTINCT opponent_id) AS unique_opponents
				FROM tmp_user_matches
			`);

			const mostFrequentOpponent = await db.get(`
				SELECT
					opponent_id, opponent_username, COUNT(*) as matches
				FROM tmp_user_matches
				GROUP BY opponent_id, opponent_username
				ORDER BY matches DESC
				LIMIT 1
			`);

			const mostWinsOpponent = await db.get(`
				SELECT
					opponent_id, opponent_username, SUM(CASE WHEN outcome = 'W' THEN 1 ELSE 0 END) as wins
				FROM tmp_user_matches
				GROUP BY opponent_id, opponent_username
				ORDER BY wins DESC
				LIMIT 1
			`);

			const mostLossesOpponent = await db.get(`
				SELECT
					opponent_id, opponent_username, SUM(CASE WHEN outcome = 'L' THEN 1 ELSE 0 END) as losses
				FROM tmp_user_matches
				GROUP BY opponent_id, opponent_username
				ORDER BY losses DESC
				LIMIT 1
			`);

			const mostDrawsOpponent = await db.get(`
				SELECT
					opponent_id, opponent_username, SUM(CASE WHEN outcome = 'D' THEN 1 ELSE 0 END) as draws
				FROM tmp_user_matches
				GROUP BY opponent_id, opponent_username
				ORDER BY draws DESC
				LIMIT 1
			`);

			const mostScoredAgainstOpponent = await db.get(`
				SELECT
					opponent_id, opponent_username, SUM(user_score) as total_scored
				FROM tmp_user_matches
				GROUP BY opponent_id, opponent_username
				ORDER BY total_scored DESC
				LIMIT 1
			`);

			const mostConcededToOpponent = await db.get(`
				SELECT
					opponent_id, opponent_username, SUM(opp_score) as total_conceded
				FROM tmp_user_matches
				GROUP BY opponent_id, opponent_username
				ORDER BY total_conceded DESC
				LIMIT 1
			`);

			return {
				totals: {
					matches: stats.matches,
					wins: stats.wins,
					losses: stats.losses,
					draws: stats.draws,
					win_rate: stats.win_rate,
				},
				scores: {
					total_user_score: stats.total_user_score,
					max_user_score: stats.max_user_score,
					min_user_score: stats.min_user_score,
					avg_user_score: stats.avg_user_score,
					avg_user_win_score: stats.avg_user_win_score,
					avg_user_loss_score: stats.avg_user_loss_score,
					avg_user_draw_score: stats.avg_user_draw_score,

					total_opp_score: stats.total_opp_score,
					max_opp_score: stats.max_opp_score,
					min_opp_score: stats.min_opp_score,
					avg_opp_score: stats.avg_opp_score,
					avg_opp_win_score: stats.avg_opp_win_score,
					avg_opp_loss_score: stats.avg_opp_loss_score,
					avg_opp_draw_score: stats.avg_opp_draw_score,
				},
				durations: {
					total_duration: stats.total_duration,
					max_duration: stats.max_duration,
					min_duration: stats.min_duration,
					avg_duration: stats.avg_duration,
					avg_user_win_duration: stats.avg_user_win_duration,
					avg_user_loss_duration: stats.avg_user_loss_duration,
					avg_user_draw_duration: stats.avg_user_draw_duration,
				},
				opponents: {
					uniqueOpponents,
					mostFrequentOpponent,
					mostWinsOpponent,
					mostLossesOpponent,
					mostDrawsOpponent,
					mostScoredAgainstOpponent,
					mostConcededToOpponent,
				}
			}

		} catch (err: any) {
			console.error('SQLite Error: ', err);
			throw new InternalServerError();
		}
	}
}

export default MatchesRepository;