import type { INodeType, INodeProperties, INodePropertyOptions } from 'n8n-workflow';
import { Fathom } from '../Fathom.node';

describe('Fathom Node', () => {
	let node: INodeType;

	beforeEach(() => {
		node = new Fathom();
	});

	describe('Node properties', () => {
		test('should have correct base configuration', () => {
			expect(node.description.displayName).toBe('Fathom');
			expect(node.description.name).toBe('fathom');
			expect(node.description.group).toEqual(['transform']);
			expect(node.description.version).toBe(1);
		});

		test('should have correct resource options', () => {
			const resourceOptions = (node.description.properties[0] as INodeProperties)
				.options as INodePropertyOptions[];
			expect(resourceOptions).toHaveLength(1);
			expect(resourceOptions[0].value).toBe('call');
		});

		test('should have correct operations for call resource', () => {
			const operationOptions = (node.description.properties[1] as INodeProperties)
				.options as INodePropertyOptions[];
			expect(operationOptions).toHaveLength(6);

			const operations = operationOptions.map((op) => op.value);
			expect(operations).toContain('get');
			expect(operations).toContain('getMany');
			expect(operations).toContain('download');
			expect(operations).toContain('searchByCompany');
			expect(operations).toContain('searchByContact');
			expect(operations).toContain('searchTranscripts');
		});
	});

	describe('Required fields', () => {
		test('should require Call ID for get and download operations', () => {
			const callIdField = node.description.properties.find(
				(p) => p.name === 'callId',
			) as INodeProperties;
			expect(callIdField?.displayOptions?.show?.operation).toEqual(['get', 'download']);
			expect(callIdField?.required).toBe(true);
		});

		test('should require Team Name for getMany operation', () => {
			const teamNameField = node.description.properties.find(
				(p) => p.name === 'teamName',
			) as INodeProperties;
			expect(teamNameField?.displayOptions?.show?.operation).toEqual(['getMany']);
			expect(teamNameField?.required).toBe(true);
		});

		test('should require Company ID for searchByCompany operation', () => {
			const companyIdField = node.description.properties.find(
				(p) => p.name === 'companyId',
			) as INodeProperties;
			expect(companyIdField?.displayOptions?.show?.operation).toEqual(['searchByCompany']);
			expect(companyIdField?.required).toBe(true);
		});

		test('should require Contact ID for searchByContact operation', () => {
			const contactIdField = node.description.properties.find(
				(p) => p.name === 'contactId',
			) as INodeProperties;
			expect(contactIdField?.displayOptions?.show?.operation).toEqual(['searchByContact']);
			expect(contactIdField?.required).toBe(true);
		});

		test('should require Search Text for searchTranscripts operation', () => {
			const searchTextField = node.description.properties.find(
				(p) => p.name === 'searchText',
			) as INodeProperties;
			expect(searchTextField?.displayOptions?.show?.operation).toEqual(['searchTranscripts']);
			expect(searchTextField?.required).toBe(true);
		});
	});

	describe('Additional fields', () => {
		test('should have cursor field for paginated operations', () => {
			const additionalFields = node.description.properties.find(
				(p) => p.name === 'additionalFields',
			) as INodeProperties;
			expect(additionalFields?.displayOptions?.show?.operation).toEqual([
				'getMany',
				'searchByCompany',
				'searchByContact',
				'searchTranscripts',
			]);

			const cursorField = (additionalFields?.options as INodeProperties[])[0];
			expect(cursorField.name).toBe('cursor');
			expect(cursorField.type).toBe('string');
		});
	});
});
