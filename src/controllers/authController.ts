import { FastifyReply, FastifyRequest } from "fastify";
import AuthService from "../services/authService";
import { CreateUserRequest, LoginRequest } from "../types";


class AuthController {
	private authService: AuthService;

	constructor() {
		this.authService = new AuthService();
	}

	// REGISTER (NO-AUTO-LOGIN): REGISTERS USER IN DB
	async RegisterRoute(request: FastifyRequest, reply: FastifyReply) {
		try {
			const userData = request.body as CreateUserRequest;
			
			const createdUser = await this.authService.SignUp(userData);
			
			reply.code(201).send({ success: true, data: createdUser});
		} catch (err: any) {
			reply.code(400).send({ success: false, error: err.message });
		}
	}
	
	// LOGIN (NO-AUTO-LOGIN): GENERATES ACCESS / REFRESH TOKENS
	async LoginRoute(request: FastifyRequest, reply: FastifyReply) {
		try {
			const userData = request.body as LoginRequest;
			const userAgent = request.headers["user-agent"] || '';
			
			const userAndTokens = await this.authService.LogIn(userData, userAgent, request.ip);

			reply.code(200).send({ success: true, data: userAndTokens });
		} catch (err: any) {
			reply.code(401).send({ success: false, error: err.message });
		}
	}
	
	// REFRESH: GENERATES ACCESS / REFRESH TOKENS
	async RefreshRoute(request: FastifyRequest, reply: FastifyReply) {
		try {
			const userAgent = request.headers["user-agent"] || '';
			
			const { newAccessToken, newRefreshToken } = await this.authService.refresh(request.headers.authorization, userAgent, request.ip);
			
			reply.code(200).send({ success: true, data: { access_token: newAccessToken, refresh_token: newRefreshToken } });
		} catch (err: any) {
			reply.code(400).send({ success: false, error: err.message});
		}
	}
	
	async RevokeAllRoute(request: FastifyRequest, reply: FastifyReply) {
		try {
			interface temp  {
				user_id: number
			};

			const { user_id } = request.body as temp;
			
			await this.authService.logoutFromAllDevices(user_id);
			
			reply.code(200).send({ success: true, data: {} });
		} catch (err: any) {
			reply.code(400).send({ success: false, error: err.message});
		}
	}
}

export default AuthController;