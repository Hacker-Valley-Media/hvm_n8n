import { NodeConnectionType } from 'n8n-workflow';
import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	INodeInputConfiguration,
	INodeOutputConfiguration,
	INode,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

// Schema interfaces
interface IFathomUser {
	id: number;
	first_name: string;
	last_name: string;
	email: string;
	avatar_url: string;
	preferences?: IDataObject;
}

interface IFathomCompany {
	domain: string;
	name: string;
	icon_url: string;
	is_multi_user: boolean;
}

interface IFathomRecording {
	created_at: string;
	started_at: string;
	duration_seconds: number;
}

interface IFathomContact {
	name: string;
}

interface IFathomShareable {
	shareUrl: string;
	access: string;
}

interface IFathomCall {
	id: number;
	action_item_count: number;
	title: string;
	byline: string;
	started_at: string;
	duration_minutes: number;
	recording: IFathomRecording;
	host: IFathomUser;
	company: IFathomCompany;
	contact: IFathomContact;
	universalShareable: IFathomShareable;
	permalink: string;
	video_url: string;
	thumbnail_url: string;
	highlight_count: number;
	is_impromptu: boolean;
	state: string;
	internal: boolean;
}

interface ITranscriptCue {
	id: number;
	text: string;
	speaker_name: string;
	speaker_email: string;
	is_host: boolean;
	start_time: number;
	end_time: number;
}

interface ICallDetail extends IFathomCall {
	matching_cues: ITranscriptCue[];
}

interface ICallSearchResults {
	items: IFathomCall[];
	next_cursor: string;
}

export class Fathom implements INodeType {
	private static formatTranscript(transcriptData: any[]): string[] {
		const results: string[] = [];

		for (const segment of transcriptData) {
			for (const item of segment) {
				const { speaker_name, start_time, text } = item;

				// Convert start time from seconds to timestamp format (HH:MM:SS)
				const hours = Math.floor(start_time / 3600);
				const minutes = Math.floor((start_time % 3600) / 60);
				const seconds = Math.floor(start_time % 60);
				const timestamp = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

				results.push(`${timestamp} - ${speaker_name}\n  ${text}`);
			}
		}

		return results;
	}

	description: INodeTypeDescription = {
		displayName: 'Fathom',
		name: 'fathom',
		icon: 'file:fathom.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with Fathom API',
		defaults: {
			name: 'Fathom',
		},
		inputs: [
			{
				type: NodeConnectionType.Main,
				displayName: 'Input',
			},
		] as INodeInputConfiguration[],
		outputs: [
			{
				type: NodeConnectionType.Main,
				displayName: 'Output',
			},
		] as INodeOutputConfiguration[],
		credentials: [
			{
				name: 'fathomApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Call',
						value: 'call',
					},
				],
				default: 'call',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['call'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Get call details',
						action: 'Get call details',
					},
					{
						name: 'Get Many',
						value: 'getMany',
						description: "Get team's previous calls",
						action: "Get team's previous calls",
					},
					{
						name: 'Download',
						value: 'download',
						description: 'Download call recording',
						action: 'Download call recording',
					},
					{
						name: 'Search by Company',
						value: 'searchByCompany',
						description: 'Search calls by company',
						action: 'Search calls by company',
					},
					{
						name: 'Search by Contact',
						value: 'searchByContact',
						description: 'Search calls by contact',
						action: 'Search calls by contact',
					},
					{
						name: 'Search Transcripts',
						value: 'searchTranscripts',
						description: 'Search call transcripts',
						action: 'Search call transcripts',
					},
					{
						name: 'Parse Transcript',
						value: 'parseTranscript',
						description: 'Parse and format transcript data',
						action: 'Parse transcript data',
					},
				],
				default: 'get',
			},
			// Call ID field (for single call operations)
			{
				displayName: 'Call ID',
				name: 'callId',
				type: 'number',
				required: true,
				displayOptions: {
					show: {
						resource: ['call'],
						operation: ['get', 'download'],
					},
				},
				default: 0,
				description: 'The ID of the call',
			},
			// Team Name field (for getMany operation)
			{
				displayName: 'Team Name',
				name: 'teamName',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['call'],
						operation: ['getMany'],
					},
				},
				default: '',
				description: 'The name of the team',
			},
			// Company ID field
			{
				displayName: 'Company ID',
				name: 'companyId',
				type: 'number',
				required: true,
				displayOptions: {
					show: {
						resource: ['call'],
						operation: ['searchByCompany'],
					},
				},
				default: 0,
				description: 'The ID of the company to search calls for',
			},
			// Contact ID field
			{
				displayName: 'Contact ID',
				name: 'contactId',
				type: 'number',
				required: true,
				displayOptions: {
					show: {
						resource: ['call'],
						operation: ['searchByContact'],
					},
				},
				default: 0,
				description: 'The ID of the contact to search calls for',
			},
			// Search Input field
			{
				displayName: 'Search Text',
				name: 'searchText',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['call'],
						operation: ['searchTranscripts'],
					},
				},
				default: '',
				description: 'The text to search for in call transcripts',
			},
			// Optional cursor field for pagination
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['call'],
						operation: ['getMany', 'searchByCompany', 'searchByContact', 'searchTranscripts'],
					},
				},
				options: [
					{
						displayName: 'Cursor',
						name: 'cursor',
						type: 'string',
						default: '',
						description: 'Cursor for pagination',
					},
				],
			},
			{
				displayName: 'Results',
				name: 'maxResults',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 20,
				description: 'The maximum number of results to return',
				displayOptions: {
					show: {
						resource: ['call'],
						operation: ['getMany', 'searchByCompany', 'searchByContact', 'searchTranscripts'],
					},
				},
			},
			{
				displayName: 'Transcript Data',
				name: 'transcriptData',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['call'],
						operation: ['parseTranscript'],
					},
				},
				default: '',
				description: 'The transcript data to parse (as a JSON string or object)',
			},
		],
	};

	private static checkForAuthError(response: string, node: INode) {
		if (response.trim().startsWith('<!DOCTYPE') || response.trim().startsWith('<html')) {
			throw new NodeOperationError(
				node,
				'Authentication failed - received HTML login page instead of JSON data',
				{
					description:
						'Please check your Fathom credentials (XSRF token and session cookie) and make sure they are valid and not expired.',
				},
			);
		}
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		console.log(`Executing Fathom node - Resource: ${resource}, Operation: ${operation}`);

		try {
			if (resource === 'call') {
				const credentials = await this.getCredentials('fathomApi');
				console.log('Retrieved Fathom credentials');

				const headers = {
					accept: 'text/html, application/xhtml+xml',
					'accept-language': 'en-US,en;q=0.9',
					'cache-control': 'no-cache',
					pragma: 'no-cache',
					'sec-fetch-dest': 'empty',
					'sec-fetch-mode': 'cors',
					'sec-fetch-site': 'same-origin',
					'x-inertia': 'true',
					'x-inertia-partial-component': 'page-call-detail',
					'x-inertia-partial-data':
						'allContacts,integrations,highlightReels,chatMessages,questions,attendeeMetadata,relatedCall,speakers,playlistMetadata,actionItemDetection,followUpEmail,actionItemAssignment,aiNotes,comments,sharing,askFathom,call,bookmarks,cueSpans,noteClips,notes,transcriptCues',
					'x-requested-with': 'XMLHttpRequest',
					'x-xsrf-token': credentials.xsrfToken as string,
					Cookie: `fathom_session=${credentials.sessionCookie}`,
				};

				let response: string | object;

				// Helper function for paginated requests
				const getPaginatedResults = async (
					endpoint: string,
					maxResults: number,
					qs: IDataObject = {},
				): Promise<{ items: IFathomCall[]; next_cursor?: string }> => {
					let allItems: IFathomCall[] = [];
					let currentCursor: string | undefined = undefined;

					while (allItems.length < maxResults) {
						if (currentCursor) {
							qs.cursor = currentCursor;
						}

						const response = await this.helpers.request({
							method: 'GET',
							url: `https://fathom.video${endpoint}`,
							qs,
							headers,
						});

						if (typeof response === 'string') {
							const parsedResponse = JSON.parse(response) as {
								items: IFathomCall[];
								next_cursor: string;
								limit: number;
							};

							allItems = allItems.concat(parsedResponse.items);
							currentCursor = parsedResponse.next_cursor;

							// If no more results or no cursor, break
							if (!currentCursor || parsedResponse.items.length === 0) {
								break;
							}
						}
					}

					// Trim to max results
					if (allItems.length > maxResults) {
						allItems = allItems.slice(0, maxResults);
					}

					return {
						items: allItems,
						next_cursor: currentCursor,
					};
				};

				if (operation === 'get') {
					const callId = this.getNodeParameter('callId', 0) as number;
					const endpoint = `/calls/${callId}`;
					console.log(`Making GET request to ${endpoint}`);

					const response = await this.helpers.request({
						method: 'GET',
						url: `https://fathom.video${endpoint}`,
						headers,
					});

					if (typeof response === 'string') {
						Fathom.checkForAuthError(response, this.getNode());
						try {
							const parsedResponse = JSON.parse(response);
							// Extract the props from the Inertia response
							const callData = parsedResponse.props || {};
							returnData.push({
								json: callData as unknown as IDataObject,
							});
						} catch (parseError) {
							throw new NodeOperationError(this.getNode(), 'Failed to parse Fathom API response', {
								description: parseError.message,
							});
						}
					} else {
						returnData.push({
							json: response as IDataObject,
						});
					}
				} else if (operation === 'getMany') {
					const teamName = this.getNodeParameter('teamName', 0) as string;
					const maxResults = this.getNodeParameter('maxResults', 0) as number;
					const additionalFields = this.getNodeParameter('additionalFields', 0) as IDataObject;
					const endpoint = `/teams/${teamName}/calls/previous`;
					const qs: IDataObject = {};

					if (additionalFields.cursor) {
						qs.cursor = additionalFields.cursor;
					}

					const results = await getPaginatedResults(endpoint, maxResults, qs);
					returnData.push({
						json: results as unknown as IDataObject,
					});
				} else if (operation === 'download') {
					const callId = this.getNodeParameter('callId', 0) as number;

					// First activate the download
					await this.helpers.request({
						method: 'GET',
						url: `https://fathom.video/calls/${callId}/activate_download`,
						headers,
					});

					// Then get the download URL
					response = await this.helpers.request({
						method: 'GET',
						url: `https://fathom.video/calls/${callId}/download`,
						headers,
					});

					returnData.push({
						json: { download_url: response } as IDataObject,
					});
				} else if (operation === 'searchByCompany') {
					const companyId = this.getNodeParameter('companyId', 0) as number;
					const maxResults = this.getNodeParameter('maxResults', 0) as number;
					const additionalFields = this.getNodeParameter('additionalFields', 0) as IDataObject;
					const endpoint = `/calls/search/company/${companyId}/paginate`;
					const qs: IDataObject = {};

					if (additionalFields.cursor) {
						qs.cursor = additionalFields.cursor;
					}

					const results = await getPaginatedResults(endpoint, maxResults, qs);
					returnData.push({
						json: results as unknown as IDataObject,
					});
				} else if (operation === 'searchByContact') {
					const contactId = this.getNodeParameter('contactId', 0) as number;
					const maxResults = this.getNodeParameter('maxResults', 0) as number;
					const additionalFields = this.getNodeParameter('additionalFields', 0) as IDataObject;
					const endpoint = `/calls/search/contact/${contactId}/paginate`;
					const qs: IDataObject = {};

					if (additionalFields.cursor) {
						qs.cursor = additionalFields.cursor;
					}

					const results = await getPaginatedResults(endpoint, maxResults, qs);
					returnData.push({
						json: results as unknown as IDataObject,
					});
				} else if (operation === 'searchTranscripts') {
					const searchText = this.getNodeParameter('searchText', 0) as string;
					const maxResults = this.getNodeParameter('maxResults', 0) as number;
					const additionalFields = this.getNodeParameter('additionalFields', 0) as IDataObject;
					const endpoint = '/calls/search/transcripts/paginate';
					const qs: IDataObject = {
						input: searchText,
					};

					if (additionalFields.cursor) {
						qs.cursor = additionalFields.cursor;
					}

					const results = await getPaginatedResults(endpoint, maxResults, qs);
					returnData.push({
						json: results as unknown as IDataObject,
					});
				} else if (operation === 'parseTranscript') {
					const transcriptData = this.getNodeParameter('transcriptData', 0) as string;
					let parsedData;
					try {
						parsedData =
							typeof transcriptData === 'string' ? JSON.parse(transcriptData) : transcriptData;
					} catch (error) {
						throw new NodeOperationError(
							this.getNode(),
							'Invalid JSON string provided for transcript data',
						);
					}

					const formattedData = {
						parsed_data: parsedData,
						formatted_data: Fathom.formatTranscript(parsedData),
					};
					returnData.push({
						json: formattedData as IDataObject,
					});
				}
			}

			return [returnData];
		} catch (error) {
			if (error.message.includes('Authentication failed')) {
				throw error;
			}
			console.error('Error retrieving call data:', error);
			throw new NodeOperationError(this.getNode(), 'Failed to retrieve call data', {
				description: error.message,
			});
		}
	}
}
