const userProfileParams = {
	type: 'object',
	properties: {
		username: { type: 'string' }
	},
	required: ['username']
}

export const userProfileSchema = {
	params: userProfileParams
}