import { NodeConnectionType } from 'n8n-workflow';
import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeType,
	INodeTypeDescription,
	INodePropertyOptions,
	IPollFunctions,
	INodeExecutionData,
	IExecuteFunctions,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import moment from 'moment-timezone';

interface IFathomRecording {
	created_at: string;
	started_at: string;
	duration_seconds: number;
}

interface IFathomHost {
	id: number;
	first_name: string;
	last_name: string;
	email: string;
	avatar_url: string;
}

interface IFathomCompany {
	domain: string | null;
	name: string;
	icon_url: string;
}

interface IFathomContact {
	name: string | null;
}

interface IFathomShareable {
	shareUrl: string | null;
	access: string;
}

interface IFathomCall {
	id: number;
	action_item_count: number;
	title: string;
	started_at: string;
	duration_minutes: number;
	recording: IFathomRecording;
	host: IFathomHost;
	company: IFathomCompany;
	contact: IFathomContact;
	universalShareable: IFathomShareable;
	permalink: string;
	thumbnail_url: string;
	highlight_count: number;
	is_impromptu: boolean;
	internal: boolean;
}

interface IFathomResponse {
	items: IFathomCall[];
	next_cursor: string;
	limit: number;
}

export class FathomTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Fathom Trigger',
		name: 'fathomTrigger',
		icon: 'file:fathom.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["triggerOn"]}}',
		description: 'Starts the workflow when Fathom events occur',
		defaults: {
			name: 'Fathom Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'fathomApi',
				required: true,
			},
		],
		polling: true,
		properties: [
			{
				displayName: 'Trigger On',
				name: 'triggerOn',
				type: 'options',
				options: [
					{
						name: 'New Call (Current User)',
						value: 'newUserCall',
						description: 'Trigger on new calls for the current user',
					},
					{
						name: 'New Team Call',
						value: 'newTeamCall',
						description: 'Trigger on new calls for the team',
					},
					{
						name: 'All New Calls',
						value: 'allNewCalls',
						description: 'Trigger on all new calls (user and team)',
					},
				],
				default: 'newUserCall',
				required: true,
			},
			{
				displayName: 'Team Name',
				name: 'teamName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						triggerOn: ['newTeamCall', 'allNewCalls'],
					},
				},
			},
		],
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const webhookData = this.getWorkflowStaticData('node');
		const triggerOn = this.getNodeParameter('triggerOn') as string;
		const teamName = this.getNodeParameter('teamName', '') as string;

		const workflowTimezone = this.getTimezone();

		// Get credentials for API call
		const credentials = await this.getCredentials('fathomApi');

		const headers = {
			accept: 'application/json, text/plain, */*',
			'accept-language': 'en-US,en;q=0.9',
			'cache-control': 'no-cache',
			pragma: 'no-cache',
			'x-xsrf-token': credentials.xsrfToken as string,
			Cookie: `fathom_session=${credentials.sessionCookie}`,
			'sec-fetch-dest': 'empty',
			'sec-fetch-mode': 'cors',
			'sec-fetch-site': 'same-origin',
		};

		try {
			const qs: IDataObject = {};

			// Set up time range for polling
			if (webhookData.lastTimeChecked === undefined) {
				webhookData.lastTimeChecked =
					moment().tz(workflowTimezone).subtract(1, 'minutes').format('YYYY-MM-DDTHH:mm:ss') + 'Z';
			}

			qs.start = webhookData.lastTimeChecked;
			qs.end = moment().tz(workflowTimezone).format('YYYY-MM-DDTHH:mm:ss') + 'Z';

			// Get the list of calls based on trigger type
			const endpoint =
				triggerOn === 'newUserCall' ? '/calls/previous' : `/teams/${teamName}/calls/previous`;
			const response = await this.helpers.request({
				method: 'GET',
				url: `https://fathom.video${endpoint}`,
				headers,
				qs,
			});

			// Update last check time
			webhookData.lastTimeChecked = qs.end;

			// Parse the response
			if (typeof response === 'string') {
				try {
					const parsedResponse = JSON.parse(response) as IFathomResponse;
					if (!parsedResponse.items || !Array.isArray(parsedResponse.items)) {
						throw new Error('Invalid response format: missing items array');
					}

					const newCalls = parsedResponse.items
						.filter((call) => {
							if (triggerOn === 'newTeamCall') {
								return call.company?.name === teamName;
							} else if (triggerOn === 'allNewCalls') {
								return call.company?.name === teamName || !call.internal;
							}
							return !call.internal;
						})
						.map((call) => {
							const dataObject: IDataObject = {
								...call,
								recording: call.recording || {},
								host: call.host || {},
								company: call.company || {},
								contact: call.contact || {},
								universalShareable: call.universalShareable || {},
							};
							return dataObject;
						});

					if (newCalls.length > 0) {
						console.log(`Found ${newCalls.length} new calls between ${qs.start} and ${qs.end}`);
						return [this.helpers.returnJsonArray(newCalls)];
					}

					console.log(`No new calls found between ${qs.start} and ${qs.end}`);
					return null;
				} catch (parseError) {
					console.error('Error parsing response:', parseError);
					throw new NodeOperationError(this.getNode(), 'Failed to parse Fathom API response', {
						description: parseError.message,
					});
				}
			}

			throw new NodeOperationError(this.getNode(), 'Invalid response from Fathom API');
		} catch (error) {
			console.error('Error polling Fathom API:', error);
			throw new NodeOperationError(this.getNode(), 'Failed to poll Fathom API', {
				description: error.message,
			});
		}
	}

	// Method to handle test events
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][] | null> {
		const triggerOn = this.getNodeParameter('triggerOn', 0) as string;
		const teamName = this.getNodeParameter('teamName', 0, '') as string;

		const credentials = await this.getCredentials('fathomApi');

		const headers = {
			accept: 'application/json, text/plain, */*',
			'accept-language': 'en-US,en;q=0.9',
			'cache-control': 'no-cache',
			pragma: 'no-cache',
			'x-xsrf-token': credentials.xsrfToken as string,
			Cookie: `fathom_session=${credentials.sessionCookie}`,
			'sec-fetch-dest': 'empty',
			'sec-fetch-mode': 'cors',
			'sec-fetch-site': 'same-origin',
		};

		try {
			// Get the list of calls based on trigger type
			const endpoint =
				triggerOn === 'newUserCall' ? '/calls/previous' : `/teams/${teamName}/calls/previous`;
			const response = await this.helpers.request({
				method: 'GET',
				url: `https://fathom.video${endpoint}`,
				headers,
			});

			// Process the response
			let parsedResponse: IFathomResponse;
			if (typeof response === 'string') {
				// Handle case where response is a string array (test event)
				try {
					const responseArray = JSON.parse(response);
					if (Array.isArray(responseArray)) {
						parsedResponse = JSON.parse(responseArray[0]);
					} else {
						parsedResponse = responseArray;
					}
				} catch (parseError) {
					throw new NodeOperationError(this.getNode(), 'Failed to parse Fathom API response', {
						description: parseError.message,
					});
				}
			} else {
				parsedResponse = response as IFathomResponse;
			}

			// Validate response structure
			if (!parsedResponse.items || !Array.isArray(parsedResponse.items)) {
				throw new NodeOperationError(
					this.getNode(),
					'Invalid response format: missing items array',
				);
			}

			// Filter based on trigger type
			const filteredCalls = parsedResponse.items
				.slice(0, 4) // Get only the last 4 calls for test events
				.filter((call: IFathomCall) => {
					if (triggerOn === 'newTeamCall') {
						return call.company?.name === teamName;
					} else if (triggerOn === 'allNewCalls') {
						return call.company?.name === teamName || !call.internal;
					}
					return !call.internal;
				})
				.map((call) => {
					const dataObject: IDataObject = {
						...call,
						recording: call.recording || {},
						host: call.host || {},
						company: call.company || {},
						contact: call.contact || {},
						universalShareable: call.universalShareable || {},
					};
					return dataObject;
				});

			if (filteredCalls.length > 0) {
				console.log(`Returning ${filteredCalls.length} calls for test trigger`);
				return [this.helpers.returnJsonArray(filteredCalls)];
			}

			return null;
		} catch (error) {
			console.error('Error fetching test calls:', error);
			throw new NodeOperationError(this.getNode(), 'Failed to fetch test calls', {
				description: error.message,
			});
		}
	}
}
