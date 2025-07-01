const userProfileParams = {
	type: 'object',
	properties: {
		username: { type: 'string' }
	},
	required: ['username'],
	additionalProperties: false
}

const userUpdateBody = {
	type: 'object',
	properties: {
		first_name: { type: 'string' },
		last_name: { type: 'string' },
		email: { type: 'string' },
		username: { type: 'string' },
		password: { type: 'string' },
		bio: { type: 'string' },
		avatar_url: { type: 'string' }
	},
	additionalProperties: false
}

const relationsRequestParams = {
	type: 'object',
	properties: {
		user_id: { type: 'string' }
	},
	required: ['user_id'],
	additionalProperties: false
}

export const userProfileSchema = {
	params: userProfileParams
}

export const userUpdateSchema = {
	body: userUpdateBody
}

export const relationsRequestSchema = {
	params: relationsRequestParams
}