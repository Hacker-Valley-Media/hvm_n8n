import type { INodeType, INodePropertyOptions } from 'n8n-workflow';
import { FathomTrigger } from '../FathomTrigger.node';

describe('FathomTrigger', () => {
	let node: INodeType;

	beforeEach(() => {
		node = new FathomTrigger();
	});

	describe('Node properties', () => {
		test('should have correct properties', () => {
			expect(node.description.properties).toHaveLength(2);
			expect(node.description.properties[0].name).toBe('triggerOn');
			expect(node.description.properties[1].name).toBe('teamName');
		});

		test('should have correct trigger options', () => {
			const triggerOptions = node.description.properties[0].options as INodePropertyOptions[];
			expect(triggerOptions).toHaveLength(3);
			expect(triggerOptions[0].value).toBe('newUserCall');
			expect(triggerOptions[1].value).toBe('newTeamCall');
			expect(triggerOptions[2].value).toBe('allNewCalls');
		});

		test('should show teamName only for team-related triggers', () => {
			const teamNameProperty = node.description.properties[1];
			expect(teamNameProperty.displayOptions?.show?.triggerOn).toEqual([
				'newTeamCall',
				'allNewCalls',
			]);
		});
	});

	describe('Node credentials', () => {
		test('should require Fathom API credentials', () => {
			const credentials = node.description.credentials;
			expect(credentials).toBeDefined();
			expect(credentials).toHaveLength(1);
			expect(credentials![0].name).toBe('fathomApi');
			expect(credentials![0].required).toBe(true);
		});
	});

	describe('Node webhook configuration', () => {
		test('should have correct webhook configuration', () => {
			expect(node.description.webhooks).toHaveLength(1);
			expect(node.description.webhooks![0].httpMethod).toBe('POST');
			expect(node.description.webhooks![0].responseMode).toBe('onReceived');
			expect(node.description.webhooks![0].path).toBe('webhook');
		});
	});
});
