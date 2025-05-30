"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_js_1 = __importDefault(require("./app.js"));
async function main() {
    const fastify = (0, app_js_1.default)();
    fastify.get('/ping', (request, reply) => {
        reply.code(200).send('pong');
    });
    fastify.listen({ host: 'localhost', port: 3000 }, (err, address) => {
        if (err)
            process.exit(1);
        console.log(`Server is listening on ${address}:${3000}...`);
    });
}
main();
//# sourceMappingURL=server.js.map