import TwoFactorService from "../services/twoFactorService";
import { FastifyRequest, FastifyReply } from "fastify";
import { I2FASetupRequest, I2FAConfirmRequest, I2FADisableRequest, IMFAVerifyRequest, IMFAEmailOTPInitRequest } from "../types";
import AuthResponseFactory from "./authResponseFactory";

class MFAController {
	private twoFactorService: TwoFactorService;

	constructor() {
		this.twoFactorService = new TwoFactorService();
	}

	/*---------------------------------------- TOTP (AUTH APP) ----------------------------------------*/
	
	async TOTPSetupInitEndpoint(request: FastifyRequest, reply: FastifyReply) {
		const user_id = request.user?.sub;
		
		try {
			const secrets = await this.twoFactorService.setupTOTP(user_id!);
			
			const { status, body } = AuthResponseFactory.getSuccessResponse(200, secrets);
			
			reply.code(status).send(body);
		} catch (err: any) {
			const { status, body } = AuthResponseFactory.getErrorResponse(err);
			
			reply.code(status).send(body);
		}
	}

	async TOTPSetupVerifyEndpoint(request: FastifyRequest, reply: FastifyReply) {
		const { code } = request.body as IMFAVerifyRequest;
		const user_id = request.user?.sub;
		
		try {
			await this.twoFactorService.confirmTOTP(code, user_id!);
			
			const { status, body } = AuthResponseFactory.getSuccessResponse(200, {});
			
			reply.code(status).send(body);
		} catch (err: any) {
			const { status, body } = AuthResponseFactory.getErrorResponse(err);
			
			reply.code(status).send(body);
		}
	}

	async TOTPVerifyEndpoint(request: FastifyRequest, reply: FastifyReply) {
		const { code } = request.body as IMFAVerifyRequest;
		const user_id = request.user?.sub;
		
		try {
			await this.twoFactorService.verifyTOTP(code, user_id!);
			
			const { status, body } = AuthResponseFactory.getSuccessResponse(200, {});
			
			reply.code(status).send(body);
		} catch (err: any) {
			const { status, body } = AuthResponseFactory.getErrorResponse(err);
			
			reply.code(status).send(body);
		}
	}


	/*------------------------------------------ OTP (EMAIL) ------------------------------------------*/
	
	async EmailOTPSetupInitEndpoint(request: FastifyRequest, reply: FastifyReply) {
		const user_id = request.user?.sub;
		
		try {
			const email = 'mock-email@gmail.com';
			
			await this.twoFactorService.setupOTP('email', email, user_id!);
			
			const { status, body } = AuthResponseFactory.getSuccessResponse(200, {});
			
			reply.code(status).send(body);
		} catch (err: any) {
			const { status, body } = AuthResponseFactory.getErrorResponse(err);
			
			reply.code(status).send(body);
		}
	}

	async EmailOTPSetupVerifyEndpoint(request: FastifyRequest, reply: FastifyReply) {
		const { code } = request.body as IMFAVerifyRequest;
		const user_id = request.user?.sub;
		
		try {
			await this.twoFactorService.confirmOTP('email', code, user_id!);
			
			const { status, body } = AuthResponseFactory.getSuccessResponse(200, {});
			
			reply.code(status).send(body);
		} catch (err: any) {
			const { status, body } = AuthResponseFactory.getErrorResponse(err);
			
			reply.code(status).send(body);
		}
	}

	async EmailOTPVerifyEndpoint(request: FastifyRequest, reply: FastifyReply) {
		const { code } = request.body as IMFAVerifyRequest;
		const user_id = request.user?.sub;
		
		try {
			await this.twoFactorService.verifyOTP('email', code, user_id!);
			
			const { status, body } = AuthResponseFactory.getSuccessResponse(200, {});
			
			reply.code(status).send(body);
		} catch (err: any) {
			const { status, body } = AuthResponseFactory.getErrorResponse(err);
			
			reply.code(status).send(body);
		}
	}


	/*------------------------------------------ OTP (SMS) ------------------------------------------*/

	async SMSOTPSetupInitEndpoint(request: FastifyRequest, reply: FastifyReply) {
		const user_id = request.user?.sub;
		
		try {
			const phone = '+212636299821';

			await this.twoFactorService.setupOTP('sms', phone, user_id!);
			
			const { status, body } = AuthResponseFactory.getSuccessResponse(200, {});
			
			reply.code(status).send(body);
		} catch (err: any) {
			const { status, body } = AuthResponseFactory.getErrorResponse(err);
			
			reply.code(status).send(body);
		}
	}

	async SMSOTPSetupVerifyEndpoint(request: FastifyRequest, reply: FastifyReply) {
		const { code } = request.body as IMFAVerifyRequest;
		const user_id = request.user?.sub;
		
		try {
			await this.twoFactorService.confirmOTP('sms', code, user_id!);
			
			const { status, body } = AuthResponseFactory.getSuccessResponse(200, {});
			
			reply.code(status).send(body);
		} catch (err: any) {
			const { status, body } = AuthResponseFactory.getErrorResponse(err);
			
			reply.code(status).send(body);
		}
	}

	async SMSOTPVerifyEndpoint(request: FastifyRequest, reply: FastifyReply) {
		const { code } = request.body as IMFAVerifyRequest;
		const user_id = request.user?.sub;
		
		try {
			await this.twoFactorService.verifyOTP('sms', code, user_id!);
			
			const { status, body } = AuthResponseFactory.getSuccessResponse(200, {});
			
			reply.code(status).send(body);
		} catch (err: any) {
			const { status, body } = AuthResponseFactory.getErrorResponse(err);
			
			reply.code(status).send(body);
		}
	}

	// async TwoFactorSetupEndpoint(request: FastifyRequest, reply: FastifyReply) {
	// 	console.log(request.body);
	// 	const { method, contact } = request.body as I2FASetupRequest;
	// 	const user_id = request.user?.sub;
		
	// 	if (!method || !user_id || ((method === 'email' || method === 'sms') && !contact))
	// 		reply.status(400).send({ success: true, data: {} });
		
	// 	try {
	// 		if (method === 'totp') {
	// 			const secrets = await this.twoFactorService.setupTOTP(user_id!);
				
	// 			reply.status(201).send({ success: true, data: secrets });
	// 		} else if (method === 'email' || method === 'sms') {
	// 			await this.twoFactorService.setupOTP(method, contact, user_id!);
				
	// 			reply.status(201).send({ success: true, data: {} });
	// 		} else {
				
	// 			reply.status(400).send({ success: false, data: {} });
	// 		}

	// 		const { status, body } = AuthResponseFactory.getSuccessResponse(200, {});

	// 	} catch (err: any) {
	// 		const { status, body } = AuthResponseFactory.getErrorResponse(err);

	// 		reply.code(status).send(body);
	// 	}
	// }

	// async TwoFactorConfirmEndpoint(request: FastifyRequest, reply: FastifyReply) {
	// 	console.log(request.body);
	// 	const { method, code } = request.body as I2FAConfirmRequest;
	// 	const user_id = request.user?.sub;

	// 	if (!method || !user_id || !code)
	// 		reply.status(400).send({ success: true, data: {} });

	// 	try {
	// 		if (method === 'totp') {
	// 			await this.twoFactorService.confirmTOTP(code, user_id!);

	// 			reply.status(201).send({ success: true, data: {} });
	// 		} else if (method === 'email' || method === 'sms') {
	// 			await this.twoFactorService.confirmOTP(code, method, user_id!);

	// 			reply.status(201).send({ success: true, data: {} });
	// 		} else {

	// 			reply.status(400).send({ success: true, data: {} });
	// 		}

	// 		const { status, body } = AuthResponseFactory.getSuccessResponse(200, {});

	// 	} catch (err: any) {
	// 		const { status, body } = AuthResponseFactory.getErrorResponse(err);

	// 		reply.code(status).send(body);
	// 	}
	// }

	// async TwoFactorVerifyEndpoint(request: FastifyRequest, reply: FastifyReply) {
	// 	console.log(request.body);
	// 	const { method, code } = request.body as I2FAConfirmRequest;
	// 	const user_id = request.user?.sub;

	// 	if (!method || !user_id || !code)
	// 		reply.status(400).send({ success: true, data: {} });

	// 	try {
	// 		if (method === 'totp') {
	// 			await this.twoFactorService.verifyTOTP(code, user_id!);

	// 			reply.status(201).send({ success: true, data: {} });
	// 		} else if (method === 'email' || method === 'sms') {
	// 			await this.twoFactorService.verifyOTP(method, code, user_id!);

	// 			reply.status(201).send({ success: true, data: {} });
	// 		} else {

	// 			reply.status(400).send({ success: true, data: {} });
	// 		}

	// 		const { status, body } = AuthResponseFactory.getSuccessResponse(200, {});

	// 	} catch (err: any) {
	// 		const { status, body } = AuthResponseFactory.getErrorResponse(err);

	// 		reply.code(status).send(body);
	// 	}
	// }

	// disable endpoint
}

export default MFAController;