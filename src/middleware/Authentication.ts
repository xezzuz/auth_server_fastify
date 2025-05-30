import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { UserPayload } from '../types';

async function AuthenticateUser(request: FastifyRequest, reply: FastifyReply) : Promise<void> {
	console.log(`Authenticating User...`);
	try {
		const authHeader = request.headers.authorization;
		
		if (!authHeader)
			return reply.code(401).send({ error: 'Access token required!' });
		
		let accessToken;
		if (authHeader.startsWith('Bearer ')) {
			accessToken = authHeader.slice(7);
		} else {
			accessToken = authHeader;
		}
		
		const decodedUserPayload = jwt.verify(accessToken, 'jwt-secret') as UserPayload;
		
		request.user = decodedUserPayload;
		console.log(`Authenticated Successfully: `);
		console.log(decodedUserPayload);
	} catch (err) {
		console.log(`Unauthorized...`);
		return reply.code(401).send({ error: 'Invalid access token!' });
	}
}

export default AuthenticateUser;