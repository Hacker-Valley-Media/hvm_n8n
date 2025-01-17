# n8n-nodes-openapi

This is an n8n node that allows you to interact with any OpenAPI/Swagger compatible API.

## Features

- Support for OpenAPI/Swagger 3.x specifications
- Load schema from URL or manual input (JSON/YAML)
- Dynamic operation loading based on schema
- Support for path, query, and body parameters
- Custom header support
- Authentication support (API Key, Bearer Token, Basic Auth, OAuth2)
- Automatic parameter validation
- Nested schema support

## Installation

Follow these steps to install the node:

1. Open your n8n installation folder
2. Go to nodes-base folder: `cd packages/nodes-base`
3. Install dependencies: `npm install`
4. Build the node: `npm run build`

## Usage

1. Add the OpenAPI node to your workflow
2. Configure the node:
   - Select schema source (URL or Manual)
   - Provide schema URL or paste schema content
   - Select operation
   - Configure parameters and request body as needed
   - Add any additional headers
3. Connect the node to your workflow

## Authentication

The node supports multiple authentication methods:

- None
- API Key (header or query)
- Bearer Token
- Basic Auth
- OAuth2

Configure the authentication in the node credentials.

## Example

Here's an example of using the node with the Fathom.video API:

1. Set schema URL to: `https://fathom.video/openapi.json`
2. Select operation (e.g., "Get team's previous calls")
3. Configure parameters:
   - team_name: Your team name
   - cursor: (optional) Pagination cursor
4. Add any required authentication credentials
5. Execute the node

## Support

For questions and support:
- Check the [n8n community forum](https://community.n8n.io)
- Create an issue in the [n8n repository](https://github.com/n8n-io/n8n)

## License

[Apache 2.0 with Commons Clause](https://github.com/n8n-io/n8n/blob/master/LICENSE.md)
