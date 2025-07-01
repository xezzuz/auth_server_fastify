import { db } from "../database"
import { InternalServerError } from "../types/auth.types";

class RelationsRepository {
	constructor() {

	}

	async clean() {
		await db.run(`
			DELETE FROM relations
		`);
	}
	
	async create(requester_id: number, receiver_id: number, relation_status: string) {
		try {
			const { lastID } = await db.run(
				`INSERT INTO relations (requester_user_id, receiver_user_id, relation_status)
					VALUES (?, ?, ?)`,
			[requester_id, receiver_id, relation_status]);
			return lastID;
		} catch (err: any) {
			console.error('SQLite Error: ', err);
			throw new InternalServerError();
		}
	}

	async findById(id: number) {
		try {
			const relation = await db.get(
				`SELECT * FROM relations WHERE id = ?`,
			[id]);
			return relation ?? null;
		} catch (err: any) {
			console.error('SQLite Error: ', err);
			throw new InternalServerError();
		}
	}

	async findTwoWaysByUsers(user_id_a: number, user_id_b: number) : Promise<any | null> {
		try {
			const relation = await db.get(
				`SELECT * FROM relations 
					WHERE (requester_user_id = ? AND receiver_user_id = ?)
					OR (requester_user_id = ? AND receiver_user_id = ?)`,
			[user_id_a, user_id_b, user_id_b, user_id_a]);
			return relation ?? null;
		} catch (err: any) {
			console.error('SQLite Error: ', err);
			throw new InternalServerError();
		}
	}

	async findOneWayByUsers(requester_id: number, receiver_id: number) {
		try {
			const relation = await db.get(
				`SELECT * FROM relations 
					WHERE requester_user_id = ? AND receiver_user_id = ?`,
			[requester_id, receiver_id]);
			return relation ?? null;
		} catch (err: any) {
			console.error('SQLite Error: ', err);
			throw new InternalServerError();
		}
	}

	// INCOMING FRIEND REQUESTS
	async findIncomingFriendRequests(user_id: number) {
		const incomingFriendRequests = await db.all(`
			SELECT users.*, relations.relation_status
				FROM relations
			JOIN users ON relations.requester_user_id = users.id
				WHERE receiver_user_id = ?
				AND relation_status = 'PENDING'`,
		[user_id]);

		console.log(incomingFriendRequests);

		return incomingFriendRequests;
	}
	
	// OUTGOING FRIEND REQUESTS
	async findOutgoingFriendRequests(user_id: number) {
		const outgoingFriendRequests = await db.all(`
			SELECT users.*, relations.relation_status
				FROM relations
			JOIN users ON relations.receiver_user_id = users.id
				WHERE requester_user_id = ?
				AND relation_status = 'PENDING'`,
		[user_id]);
		 
		console.log(outgoingFriendRequests);
		 
		return outgoingFriendRequests;
	}
			
	// BLOCKED USERS (WHO BLOCKED THIS USER)
	async findIncomingBlocks(user_id: number) {
		const incomingBlocks = await db.all(`
			SELECT users.*, relations.relation_status
				FROM relations
			JOIN users ON relations.requester_user_id = users.id
				WHERE receiver_user_id = ?
				AND relation_status = 'BLOCKED'`,
		[user_id]);
		
		console.log(incomingBlocks);
		
		return incomingBlocks;
	}

	// BLOCKED USERS (WHO THIS USER BLOCKED)
	async findOutgoingBlocks(user_id: number) {
		const outgoingBlocks = await db.all(`
			SELECT users.*, relations.relation_status
				FROM relations
			JOIN users ON relations.receiver_user_id = users.id
				WHERE requester_user_id = ?
				AND relation_status = 'BLOCKED'`,
		[user_id]);
		
		console.log(outgoingBlocks);
		
		return outgoingBlocks;
	}

	// RELATION BETWEEN TWO USERS (BI-DIRECTION)
	async findRelationStatusByUsers(user_id_a: number, user_id_b: number) : Promise<string> {
		const relationStatus = await db.get(`
			SELECT relation_status
				FROM relations
			WHERE (requester_user_id = ? AND receiver_user_id = ?)
			OR (requester_user_id = ? AND receiver_user_id = ?)
		`, [user_id_a, user_id_b, user_id_b, user_id_a]);

		console.log(relationStatus);

		return relationStatus;
	}
	
	// CHECK BLOCK BETWEEN TWO USERS (BI-DIRECTION)
	async findTwoWaysBlockBetweenUsers(user_id_a: number, user_id_b: number) {
		const relation = await db.get(`
			SELECT *
				FROM relations
			WHERE ((requester_user_id = ? AND receiver_user_id = ?)
			OR (requester_user_id = ? AND receiver_user_id = ?))
			AND relation_status = 'BLOCKED'
		`, [user_id_a, user_id_b, user_id_b, user_id_a]);

		console.log(relation);

		return relation;
	}

	// CHECK BLOCK BETWEEN TWO USERS (UNI-DIRECTION)
	async findOneWayBlockBetweenUsers(blocker_user_id: number, blocked_user_id: number) {
		const relation = await db.get(`
			SELECT *
				FROM relations
			WHERE (requester_user_id = ? AND receiver_user_id = ?)
			AND relation_status = 'BLOCKED'
		`, [blocker_user_id, blocked_user_id]);

		console.log(relation);

		return relation;
	}

	async updateRelationStatus(id: number, status: string) : Promise<boolean> {
		try {
			const { changes } = await db.run(`
				UPDATE relations 
				SET relation_status = ?, updated_at = CURRENT_TIMESTAMP
				WHERE id = ?
			`, [status, id]);
			return changes > 0;
		} catch (err: any) {
			console.error('SQLite Error: ', err);
			throw new InternalServerError();
		}
	}

	async deleteRelationById(id: number) {
		const runResult = await db.run(`
			DELETE FROM relations
			WHERE id = ?
		`, [id]);

		console.log(runResult);

		return runResult;
	}

	async deleteOneWayRelationByUsers(requester_id: number, receiver_id: number) {
		const runResult = await db.run(`
			DELETE FROM relations
			WHERE requester_user_id = ? AND receiver_user_id = ?
		`, [requester_id, receiver_id]);

		console.log(runResult);

		return runResult;
	}

	async deleteTwoWaysRelationByUsers(requester_id: number, receiver_id: number) {
		const runResult = await db.run(`
			DELETE FROM relations
			WHERE (requester_user_id = ? AND receiver_user_id = ?)
			OR (requester_user_id = ? AND receiver_user_id = ?)
		`, [requester_id, receiver_id, receiver_id, requester_id]);

		console.log(runResult);

		return runResult;
	}

	async findAllFriends(user_id: number) {
		const allFriends = await db.all(`
			SELECT users.*, relations.relation_status
			FROM relations
			JOIN users ON (
				(relations.requester_user_id = users.id AND relations.receiver_user_id = ?)
				(relations.requester_user_id = ? AND relations.receiver_user_id = users.id)
			)
			WHERE relations.relation_status = 'ACCEPTED'
		`, [user_id, user_id]);

		console.log(allFriends);

		return allFriends;
	}

	async countFriends(user_id: number) {
		const runResult = await db.get(`
			SELECT COUNT(*)
				FROM relations
			WHERE (requester_user_id = ? OR receiver_user_id = ?)
				AND relation_status = 'ACCEPTED'
		`, [user_id, user_id]);

		console.log(runResult);

		return runResult;
	}

	async countIncomingFriendRequests(user_id: number) {
		const runResult = await db.get(`
			SELECT COUNT(*)
				FROM relations
			WHERE receiver_user_id = ?
				AND relation_status = 'PENDING'
		`, [user_id]);

		console.log(runResult);

		return runResult;
	}

	async countOutgoingFriendRequests(user_id: number) {
		const runResult = await db.get(`
			SELECT COUNT(*)
				FROM relations
			WHERE requester_user_id = ?
				AND relation_status = 'PENDING'
		`, [user_id]);

		console.log(runResult);

		return runResult;
	}
}

export default RelationsRepository;