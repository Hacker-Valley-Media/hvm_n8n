import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IHttpRequestMethods,
	NodeConnectionType,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	buildQueryString,
	getBaseUrl,
	getPathParameters,
	parseOpenAPISchema,
	replacePathParameters,
	validateParameterType,
	validateRequiredParameters,
} from './helpers';

import { getOperations, getParameters, getRequestBody } from './loadOptions';

export class OpenApi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'OpenAPI',
		name: 'openApi',
		icon: 'file:openApi.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Make calls to any OpenAPI/Swagger compatible API',
		defaults: {
			name: 'OpenAPI',
		},
		inputs: [
			{
				displayName: 'Input',
				maxConnections: 1,
				required: true,
				type: NodeConnectionType.Main,
			},
		],
		outputs: [
			{
				displayName: 'Output',
				maxConnections: 1,
				required: true,
				type: NodeConnectionType.Main,
			},
		],
		credentials: [
			{
				name: 'openApiApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Schema Source',
				name: 'schemaInput',
				type: 'options',
				options: [
					{
						name: 'URL',
						value: 'url',
					},
					{
						name: 'Manual',
						value: 'manual',
					},
				],
				default: 'url',
				description: 'Where to get the OpenAPI schema from',
			},
			{
				displayName: 'Schema URL',
				name: 'schemaUrl',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						schemaInput: ['url'],
					},
				},
				description: 'URL of the OpenAPI schema',
			},
			{
				displayName: 'Schema',
				name: 'schemaContent',
				type: 'string',
				typeOptions: {
					rows: 10,
				},
				default: '',
				required: true,
				displayOptions: {
					show: {
						schemaInput: ['manual'],
					},
				},
				description: 'OpenAPI schema (JSON or YAML)',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getOperations',
				},
				default: '',
				required: true,
				description: 'Operation to perform',
			},
			{
				displayName: 'Parameters',
				name: 'parameters',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
					loadOptionsMethod: 'getParameters',
				},
				default: {},
				description: 'Operation parameters',
			},
			{
				displayName: 'Request Body',
				name: 'requestBody',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: false,
					loadOptionsMethod: 'getRequestBody',
				},
				default: {},
				description: 'Request body parameters',
			},
			{
				displayName: 'Additional Headers',
				name: 'additionalHeaders',
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
		],
	};

	methods = {
		loadOptions: {
			getOperations,
			getParameters,
			getRequestBody,
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const credentials = await this.getCredentials('openApiApi');

		let schema: IDataObject;
		const schemaInput = this.getNodeParameter('schemaInput', 0) as string;
		const schemaUrl = this.getNodeParameter('schemaUrl', 0, '') as string;
		const schemaContent = this.getNodeParameter('schemaContent', 0, '') as string;

		if (schemaInput === 'url' && schemaUrl) {
			const response = await this.helpers.request({
				method: 'GET',
				url: schemaUrl,
				json: true,
			});
			schema = response;
		} else if (schemaInput === 'manual' && schemaContent) {
			schema = await parseOpenAPISchema(schemaContent as unknown as IDataObject, this.getNode());
		} else {
			throw new NodeOperationError(this.getNode(), 'No schema provided');
		}

		const parsedSchema = await parseOpenAPISchema(schema, this.getNode());
		const baseUrl = getBaseUrl(parsedSchema);

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;
				const [method, path] = operation.split('|');

				const paths = parsedSchema.paths as IDataObject;
				const operationDetails = (paths[path] as IDataObject)[method] as IDataObject;

				// Handle path parameters
				const pathParams = getPathParameters(path);
				const parameters = this.getNodeParameter('parameters', i, {}) as IDataObject;
				const paramValues: IDataObject = {};

				if (operationDetails.parameters) {
					validateRequiredParameters(
						operationDetails.parameters as IDataObject[],
						parameters,
						this.getNode(),
					);

					for (const param of operationDetails.parameters as IDataObject[]) {
						const value = parameters[`${param.in}|${param.name}`];
						if (value !== undefined) {
							validateParameterType(param, value, this.getNode());
							if (param.in === 'path') {
								paramValues[param.name as string] = value;
							} else if (param.in === 'query') {
								paramValues[param.name as string] = value;
							}
						}
					}
				}

				const resolvedPath = replacePathParameters(path, paramValues);
				const queryString = buildQueryString(paramValues);

				// Handle request body
				const requestBody = this.getNodeParameter('requestBody', i, {}) as IDataObject;
				let body: IDataObject | undefined;
				let contentType: string | undefined;

				if (
					operationDetails.requestBody &&
					(operationDetails.requestBody as IDataObject).content &&
					requestBody.mediaType
				) {
					const content = (operationDetails.requestBody as IDataObject).content as IDataObject;
					const mediaType = requestBody.mediaType as string;
					const mediaTypeContent = content[mediaType] as IDataObject;
					const schema = mediaTypeContent.schema as IDataObject;

					if (schema && requestBody.body) {
						body = requestBody.body as IDataObject;
						contentType = mediaType;
					}
				}

				// Handle additional headers
				const additionalHeaders = this.getNodeParameter('additionalHeaders', i, {}) as IDataObject;
				const headers: IDataObject = {};

				if (additionalHeaders?.headers) {
					for (const header of additionalHeaders.headers as IDataObject[]) {
						headers[header.name as string] = header.value;
					}
				}

				if (contentType) {
					headers['Content-Type'] = contentType;
				}

				// Make the request
				const response = await this.helpers.requestWithAuthentication.call(this, 'openApiApi', {
					method: method.toUpperCase() as IHttpRequestMethods,
					url: `${baseUrl}${resolvedPath}${queryString}`,
					body,
					headers,
				});

				returnData.push({
					json: response,
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
						},
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
