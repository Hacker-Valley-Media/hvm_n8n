import yaml from 'js-yaml';
import type { IDataObject, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export async function parseOpenAPISchema(schema: IDataObject, node: INode) {
	try {
		if (typeof schema === 'string') {
			try {
				return JSON.parse(schema);
			} catch (e) {
				return yaml.load(schema);
			}
		}
		return schema;
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		throw new NodeOperationError(node, `Failed to parse OpenAPI schema: ${errorMessage}`);
	}
}

export function resolveSchemaReference(schema: IDataObject, reference: string, node: INode) {
	const parts = reference.split('/');
	let current = schema;

	// Remove the first empty part and #
	parts.shift();
	if (parts[0] === '#') parts.shift();

	for (const part of parts) {
		if (current[part] === undefined) {
			throw new NodeOperationError(node, `Invalid reference: ${reference}`);
		}
		current = current[part] as IDataObject;
	}

	return current;
}

export function buildParameterSchema(parameter: IDataObject) {
	const schema: IDataObject = {
		type: parameter.type || 'string',
		description: parameter.description || '',
		default: parameter.default,
	};

	if (parameter.enum) {
		schema.enum = parameter.enum;
	}

	if (parameter.format) {
		schema.format = parameter.format;
	}

	if (parameter.minimum !== undefined) {
		schema.minimum = parameter.minimum;
	}

	if (parameter.maximum !== undefined) {
		schema.maximum = parameter.maximum;
	}

	if (parameter.pattern) {
		schema.pattern = parameter.pattern;
	}

	return schema;
}

export function buildRequestBodySchema(content: IDataObject) {
	const schema: IDataObject = {};

	for (const mediaType of Object.keys(content)) {
		const mediaTypeContent = content[mediaType] as IDataObject;
		const mediaTypeSchema = mediaTypeContent.schema as IDataObject;
		if (mediaTypeSchema?.$ref) {
			schema[mediaType] = { $ref: mediaTypeSchema.$ref };
		} else if (mediaTypeSchema) {
			schema[mediaType] = mediaTypeSchema;
		}
	}

	return schema;
}

export function buildResponseSchema(responses: IDataObject) {
	const schema: IDataObject = {};

	for (const statusCode of Object.keys(responses)) {
		const response = responses[statusCode] as IDataObject;
		if (response.content) {
			schema[statusCode] = buildRequestBodySchema(response.content as IDataObject);
		}
	}

	return schema;
}

export function getBaseUrl(schema: IDataObject) {
	if (schema.servers && Array.isArray(schema.servers)) {
		const server = schema.servers[0] as IDataObject;
		return server.url as string;
	}
	return '';
}

export function getPathParameters(path: string) {
	const parameters: string[] = [];
	const regex = /{([^}]+)}/g;
	let match;

	while ((match = regex.exec(path)) !== null) {
		parameters.push(match[1]);
	}

	return parameters;
}

export function replacePathParameters(path: string, parameters: IDataObject) {
	return path.replace(/{([^}]+)}/g, (_, key) => parameters[key]?.toString() || '');
}

export function buildQueryString(parameters: IDataObject) {
	const parts: string[] = [];

	for (const [key, value] of Object.entries(parameters)) {
		if (value !== undefined && value !== null && value !== '') {
			if (Array.isArray(value)) {
				for (const item of value) {
					if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
						parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(item)}`);
					}
				}
			} else if (
				typeof value === 'string' ||
				typeof value === 'number' ||
				typeof value === 'boolean'
			) {
				parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
			}
		}
	}

	return parts.length ? `?${parts.join('&')}` : '';
}

export function validateRequiredParameters(
	parameters: IDataObject[],
	values: IDataObject,
	node: INode,
) {
	const missing: string[] = [];

	for (const param of parameters) {
		if (param.required && !values[param.name as string]) {
			missing.push(param.name as string);
		}
	}

	if (missing.length) {
		throw new NodeOperationError(node, `Missing required parameters: ${missing.join(', ')}`);
	}
}

export function validateParameterType(parameter: IDataObject, value: unknown, node: INode) {
	const type = parameter.type as string;
	const format = parameter.format as string;

	switch (type) {
		case 'string':
			if (typeof value !== 'string') {
				throw new NodeOperationError(
					node,
					`Parameter ${parameter.name} must be a string, got ${typeof value}`,
				);
			}
			if (format === 'date-time') {
				if (!Date.parse(value)) {
					throw new NodeOperationError(
						node,
						`Parameter ${parameter.name} must be a valid date-time string`,
					);
				}
			}
			break;
		case 'number':
		case 'integer':
			if (typeof value !== 'number') {
				throw new NodeOperationError(
					node,
					`Parameter ${parameter.name} must be a number, got ${typeof value}`,
				);
			}
			break;
		case 'boolean':
			if (typeof value !== 'boolean') {
				throw new NodeOperationError(
					node,
					`Parameter ${parameter.name} must be a boolean, got ${typeof value}`,
				);
			}
			break;
		case 'array':
			if (!Array.isArray(value)) {
				throw new NodeOperationError(
					node,
					`Parameter ${parameter.name} must be an array, got ${typeof value}`,
				);
			}
			break;
		case 'object':
			if (typeof value !== 'object' || Array.isArray(value)) {
				throw new NodeOperationError(
					node,
					`Parameter ${parameter.name} must be an object, got ${typeof value}`,
				);
			}
			break;
	}
}
