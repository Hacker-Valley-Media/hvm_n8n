import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class OpenApiApi implements ICredentialType {
	name = 'openApiApi';

	displayName = 'OpenAPI API';

	documentationUrl = '';

	properties: INodeProperties[] = [
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'options',
			options: [
				{
					name: 'None',
					value: 'none',
				},
				{
					name: 'API Key',
					value: 'apiKey',
				},
				{
					name: 'Bearer Token',
					value: 'bearerToken',
				},
				{
					name: 'Basic Auth',
					value: 'basicAuth',
				},
				{
					name: 'OAuth2',
					value: 'oAuth2',
				},
			],
			default: 'none',
		},
		{
			displayName: 'API Key Name',
			name: 'apiKeyName',
			type: 'string',
			default: '',
			typeOptions: {
				password: true,
			},
			displayOptions: {
				show: {
					authentication: ['apiKey'],
				},
			},
		},
		{
			displayName: 'API Key Value',
			name: 'apiKeyValue',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			displayOptions: {
				show: {
					authentication: ['apiKey'],
				},
			},
		},
		{
			displayName: 'API Key Location',
			name: 'apiKeyLocation',
			type: 'options',
			options: [
				{
					name: 'Header',
					value: 'header',
				},
				{
					name: 'Query',
					value: 'query',
				},
			],
			default: 'header',
			displayOptions: {
				show: {
					authentication: ['apiKey'],
				},
			},
		},
		{
			displayName: 'Token',
			name: 'bearerToken',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			displayOptions: {
				show: {
					authentication: ['bearerToken'],
				},
			},
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
			displayOptions: {
				show: {
					authentication: ['basicAuth'],
				},
			},
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			displayOptions: {
				show: {
					authentication: ['basicAuth'],
				},
			},
		},
		{
			displayName: 'OAuth2 Token URL',
			name: 'oAuth2TokenUrl',
			type: 'string',
			default: '',
			displayOptions: {
				show: {
					authentication: ['oAuth2'],
				},
			},
		},
		{
			displayName: 'OAuth2 Client ID',
			name: 'oAuth2ClientId',
			type: 'string',
			default: '',
			displayOptions: {
				show: {
					authentication: ['oAuth2'],
				},
			},
		},
		{
			displayName: 'OAuth2 Client Secret',
			name: 'oAuth2ClientSecret',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			displayOptions: {
				show: {
					authentication: ['oAuth2'],
				},
			},
		},
		{
			displayName: 'OAuth2 Scope',
			name: 'oAuth2Scope',
			type: 'string',
			default: '',
			displayOptions: {
				show: {
					authentication: ['oAuth2'],
				},
			},
		},
		{
			displayName: 'Custom Headers',
			name: 'customHeaders',
			placeholder: 'Add Header',
			type: 'fixedCollection',
			typeOptions: {
				multipleValues: true,
			},
			default: {},
			options: [
				{
					name: 'headers',
					displayName: 'Header',
					values: [
						{
							displayName: 'Name',
							name: 'name',
							type: 'string',
							default: '',
							description: 'Name of the header',
						},
						{
							displayName: 'Value',
							name: 'value',
							type: 'string',
							default: '',
							description: 'Value of the header',
						},
					],
				},
			],
		},
		{
			displayName: 'Custom Body',
			name: 'customBody',
			type: 'json',
			default: '{}',
			description: 'Custom body to be sent with the request (as JSON)',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'Content-Type': 'application/json',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials?.url}}',
			url: '',
			method: 'GET',
		},
	};
}
