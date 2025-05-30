import initializeApp from "./app";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
const UAParser = require('ua-parser-js');

async function main() {
	const fastify: FastifyInstance = await initializeApp();
	
	fastify.get('/', (request: FastifyRequest, reply: FastifyReply) => {
		// const user_agent = request.headers["user-agent"];
		// const ip = request.ip;
		
		// const parser = new UAParser();
		// const ua = parser.setUA(user_agent).getResult();
		
		// console.log(`ip: ${ip}`);
		// console.log(`user-agent: ${user_agent}`);
		// console.log(`device_name: ${ua.device.vendor} ${ua.device.model} ${ua.os.name} ${ua.os.version}`);
		// console.log(`device_name: ${ua.browser.name} ${ua.browser.major}`);
		reply.code(200).send('pong');
	});

	fastify.listen({ host: '127.0.0.1', port: 3000 }, (err: Error | null, address: string) => {
		if (err)
			process.exit(1);
		console.log(`Authentication Server is listening on 3000...`);
	});
}

main();