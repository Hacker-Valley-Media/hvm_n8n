import type { IDataObject, ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import { parseOpenAPISchema } from './helpers';

export async function getOperations(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const schemaInput = this.getNodeParameter('schemaInput', 0) as string;
	const schemaUrl = this.getNodeParameter('schemaUrl', 0, {}) as string;
	const schemaContent = this.getNodeParameter('schemaContent', 0, {}) as string;

	let schema: IDataObject;
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
		return returnData;
	}

	const parsedSchema = await parseOpenAPISchema(schema, this.getNode());
	const paths = parsedSchema.paths || {};

	for (const path of Object.keys(paths)) {
		const methods = paths[path] as IDataObject;
		for (const method of Object.keys(methods)) {
			const operation = methods[method] as IDataObject;
			returnData.push({
				name: `[${method.toUpperCase()}] ${operation.summary || path}`,
				value: `${method}|${path}`,
				description: (operation.description as string) || '',
			});
		}
	}

	return returnData;
}

export async function getParameters(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const operation = this.getNodeParameter('operation', 0) as string;
	const [method, path] = operation.split('|');

	const schemaInput = this.getNodeParameter('schemaInput', 0) as string;
	const schemaUrl = this.getNodeParameter('schemaUrl', 0, {}) as string;
	const schemaContent = this.getNodeParameter('schemaContent', 0, {}) as string;

	let schema: IDataObject;
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
		return returnData;
	}

	const parsedSchema = await parseOpenAPISchema(schema, this.getNode());
	const paths = parsedSchema.paths as IDataObject;
	const operationDetails = (paths[path] as IDataObject)[method] as IDataObject;

	if (operationDetails.parameters) {
		for (const param of operationDetails.parameters as IDataObject[]) {
			returnData.push({
				name: param.name as string,
				value: `${param.in}|${param.name}`,
				description: (param.description as string) || '',
			});
		}
	}

	return returnData;
}

export async function getRequestBody(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const operation = this.getNodeParameter('operation', 0) as string;
	const [method, path] = operation.split('|');

	const schemaInput = this.getNodeParameter('schemaInput', 0) as string;
	const schemaUrl = this.getNodeParameter('schemaUrl', 0, {}) as string;
	const schemaContent = this.getNodeParameter('schemaContent', 0, {}) as string;

	let schema: IDataObject;
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
		return returnData;
	}

	const parsedSchema = await parseOpenAPISchema(schema, this.getNode());
	const paths = parsedSchema.paths as IDataObject;
	const operationDetails = (paths[path] as IDataObject)[method] as IDataObject;
	const requestBody = operationDetails.requestBody as IDataObject | undefined;

	if (requestBody?.content) {
		const content = requestBody.content as IDataObject;
		for (const mediaType of Object.keys(content)) {
			const mediaTypeContent = content[mediaType] as IDataObject;
			const mediaTypeSchema = mediaTypeContent.schema as IDataObject;
			if (mediaTypeSchema) {
				returnData.push({
					name: mediaType,
					value: mediaType,
					description: (mediaTypeSchema.description as string) || '',
				});
			}
		}
	}

	return returnData;
}
