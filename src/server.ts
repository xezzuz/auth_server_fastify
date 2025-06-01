import initializeApp from "./app";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
const UAParser = require('ua-parser-js');

async function main() {
	const fastify: FastifyInstance = await initializeApp();
	
	fastify.get('/', (request: FastifyRequest, reply: FastifyReply) => {
		reply.code(200).send('pong');
	});

	fastify.listen({ host: '127.0.0.1', port: 3001 }, (err: Error | null, address: string) => {
		if (err)
			process.exit(1);
		console.log(`Authentication Server is listening on 3001...`);
	});
}

main();