import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class FathomApi implements ICredentialType {
	name = 'fathomApi';
	displayName = 'Fathom API';
	documentationUrl = 'https://fathom.video/docs/api';
	properties: INodeProperties[] = [
		{
			displayName: 'XSRF Token',
			name: 'xsrfToken',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			description: 'XSRF token from your Fathom session',
		},
		{
			displayName: 'Session Cookie',
			name: 'sessionCookie',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			description: 'Fathom session cookie (fathom_session)',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				accept: 'application/json, text/plain, */*',
				'accept-language': 'en-US,en;q=0.9',
				'cache-control': 'no-cache',
				pragma: 'no-cache',
				'x-xsrf-token': '={{$credentials.xsrfToken}}',
				Cookie: '={{`fathom_session=${$credentials.sessionCookie}`}}',
				'sec-fetch-dest': 'empty',
				'sec-fetch-mode': 'cors',
				'sec-fetch-site': 'same-origin',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://fathom.video',
			url: '/calls/previous',
			method: 'GET',
			headers: {
				accept: 'application/json, text/plain, */*',
				'accept-language': 'en-US,en;q=0.9',
				'cache-control': 'no-cache',
				pragma: 'no-cache',
				'x-xsrf-token': '={{$credentials.xsrfToken}}',
				Cookie: '={{`fathom_session=${$credentials.sessionCookie}`}}',
				'sec-fetch-dest': 'empty',
				'sec-fetch-mode': 'cors',
				'sec-fetch-site': 'same-origin',
			},
		},
	};
}
