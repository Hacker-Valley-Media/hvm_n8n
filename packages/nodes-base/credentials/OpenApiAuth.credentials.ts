import { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'n8n-workflow';

export class OpenAPIAuth implements ICredentialType {
	name = 'openAPIAuth';
	displayName = 'OpenAPI Auth';
	documentationUrl = '';
	properties: INodeProperties[] = [
		{
			displayName: 'Authentication Type',
			name: 'authType',
			type: 'options',
			options: [
				{
					name: 'API Key',
					value: 'apiKey',
				},
				{
					name: 'Bearer Token',
					value: 'bearer',
				},
				{
					name: 'Basic Auth',
					value: 'basic',
				},
				{
					name: 'None',
					value: 'none',
				},
			],
			default: 'none',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			displayOptions: {
				show: {
					authType: ['apiKey'],
				},
			},
			default: '',
		},
		{
			displayName: 'API Key Name',
			name: 'apiKeyName',
			type: 'string',
			displayOptions: {
				show: {
					authType: ['apiKey'],
				},
			},
			default: '',
			description: 'Name of the header or query parameter for the API key',
		},
		{
			displayName: 'API Key Location',
			name: 'apiKeyLocation',
			type: 'options',
			displayOptions: {
				show: {
					authType: ['apiKey'],
				},
			},
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
		},
		{
			displayName: 'Bearer Token',
			name: 'bearerToken',
			type: 'string',
			typeOptions: {
				password: true,
			},
			displayOptions: {
				show: {
					authType: ['bearer'],
				},
			},
			default: '',
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			displayOptions: {
				show: {
					authType: ['basic'],
				},
			},
			default: '',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			displayOptions: {
				show: {
					authType: ['basic'],
				},
			},
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '={{"Bearer " + $credentials.bearerToken}}',
			},
		},
	};
}
