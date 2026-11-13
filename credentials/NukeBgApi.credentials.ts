import type { IAuthenticateGeneric, ICredentialTestRequest, ICredentialType, INodeProperties } from "n8n-workflow";

export class NukeBgApi implements ICredentialType {
  name = "nukeBgApi";
  displayName = "NukeBG API";
  documentationUrl = "https://nukebg.com/docs#auth";
  icon = { light: "file:../nodes/NukeBg/nukebg.svg", dark: "file:../nodes/NukeBg/nukebg.dark.svg" } as const;

  properties: INodeProperties[] = [
    {
      displayName: "API Key",
      name: "apiKey",
      type: "string",
      typeOptions: { password: true },
      default: "",
      required: true,
      description: "Create a key at https://nukebg.com/account. New accounts get 50 free credits.",
    },
    {
      displayName: "Base URL",
      name: "baseUrl",
      type: "string",
      default: "https://api.nukebg.com",
      description: "Leave as is unless NukeBG support gives you another host",
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: "generic",
    properties: { headers: { "X-Api-Key": "={{$credentials.apiKey}}" } },
  };

  test: ICredentialTestRequest = {
    request: { baseURL: "={{$credentials.baseUrl}}", url: "/v1/account" },
  };
}
