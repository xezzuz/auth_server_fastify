"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
function buildApp() {
    const fastify = (0, fastify_1.default)();
    return fastify;
}
exports.default = buildApp;
//# sourceMappingURL=app.js.map