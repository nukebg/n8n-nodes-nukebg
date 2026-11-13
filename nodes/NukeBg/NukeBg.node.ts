import type { IDataObject, IExecuteFunctions, IHttpRequestOptions, INodeExecutionData, INodeType, INodeTypeDescription, JsonObject } from "n8n-workflow";
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from "n8n-workflow";

const SIZES = ["original", "amazon", "shopify", "etsy", "ebay", "instagram", "story"];

/**
 * NukeBG for n8n: remove backgrounds, remove objects and upscale images, with binary data in and out.
 * Replaces remove.bg's n8n integration, which stops working on 1 December 2026.
 */
export class NukeBg implements INodeType {
  description: INodeTypeDescription = {
    displayName: "NukeBG",
    name: "nukeBg",
    icon: { light: "file:nukebg.svg", dark: "file:nukebg.dark.svg" },
    group: ["transform"],
    version: 1,
    subtitle: '={{$parameter["operation"]}}',
    description: "Remove image backgrounds, remove objects and upscale images with NukeBG",
    defaults: { name: "NukeBG" },
    inputs: [NodeConnectionTypes.Main],
    outputs: [NodeConnectionTypes.Main],
    usableAsTool: true,
    credentials: [{ name: "nukeBgApi", required: true }],
    properties: [
      {
        displayName: "Operation",
        name: "operation",
        type: "options",
        noDataExpression: true,
        default: "removeBackground",
        options: [
          { name: "Remove Background", value: "removeBackground", action: "Remove the background from an image", description: "Transparent cutout, or the subject on white or a colour at a marketplace size" },
          { name: "Remove Objects", value: "erase", action: "Remove objects from an image", description: "Remove what you describe; the rest stays unchanged" },
          { name: "Upscale", value: "upscale", action: "Upscale an image", description: "2× or 4× upscale (paid credits)" },
          { name: "Get Credits", value: "account", action: "Get the credit balance", description: "Balance and plan for the API key" },
        ],
      },
      {
        displayName: "Input",
        name: "inputType",
        type: "options",
        default: "binary",
        displayOptions: { hide: { operation: ["account"] } },
        options: [
          { name: "Binary File", value: "binary" },
          { name: "Image URL", value: "url" },
        ],
      },
      {
        displayName: "Input Binary Field",
        name: "binaryPropertyName",
        type: "string",
        default: "data",
        required: true,
        displayOptions: { show: { inputType: ["binary"] }, hide: { operation: ["account"] } },
        description: "Name of the binary field that holds the image (JPG, PNG or WebP)",
      },
      {
        displayName: "Image URL",
        name: "imageUrl",
        type: "string",
        default: "",
        required: true,
        placeholder: "https://example.com/product.jpg",
        displayOptions: { show: { inputType: ["url"] }, hide: { operation: ["account"] } },
      },
      {
        displayName: "What to Remove",
        name: "prompt",
        type: "string",
        default: "",
        required: true,
        placeholder: "the cables on the desk",
        displayOptions: { show: { operation: ["erase"] } },
      },
      {
        displayName: "Scale",
        name: "scale",
        type: "options",
        default: 2,
        options: [
          { name: "2×", value: 2 },
          { name: "4×", value: 4 },
        ],
        displayOptions: { show: { operation: ["upscale"] } },
      },
      {
        displayName: "Output Binary Field",
        name: "outputPropertyName",
        type: "string",
        default: "data",
        displayOptions: { hide: { operation: ["account"] } },
        description: "Binary field to write the result to",
      },
      {
        displayName: "Options",
        name: "options",
        type: "collection",
        placeholder: "Add Option",
        default: {},
        displayOptions: { show: { operation: ["removeBackground"] } },
        options: [
          { displayName: "Background", name: "background", type: "string", default: "transparent", description: "Transparent, white, a hex colour such as #F5F5F5, gradient:#a,#b or scene:&lt;ID&gt;" },
          { displayName: "Crop to Subject", name: "crop", type: "boolean", default: false },
          {
            displayName: "Format",
            name: "format",
            type: "options",
            default: "png",
            options: [
              { name: "PNG", value: "png" },
              { name: "WebP", value: "webp" },
              { name: "JPG", value: "jpg" },
            ],
          },
          { displayName: "Main Subject Only", name: "mainSubject", type: "boolean", default: false, description: "Whether to drop small stray objects next to the main subject" },
          {
            displayName: "Quality",
            name: "quality",
            type: "options",
            default: "standard",
            options: [
              { name: "Preview (0.25 MP)", value: "preview" },
              { name: "Standard (4 MP, 1 Credit)", value: "standard" },
              { name: "HD (25 MP, 2 Credits)", value: "hd" },
              { name: "Ultra (50 MP, 4 Credits)", value: "ultra" },
            ],
          },
          {
            displayName: "Shadow",
            name: "shadow",
            type: "options",
            default: "none",
            options: [
              { name: "None", value: "none" },
              { name: "Soft", value: "soft" },
              { name: "Contact", value: "contact" },
            ],
          },
          { displayName: "Size", name: "size", type: "options", default: "original", options: SIZES.map((s) => ({ name: s[0].toUpperCase() + s.slice(1), value: s })) },
        ],
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const out: INodeExecutionData[] = [];
    const creds = await this.getCredentials("nukeBgApi");
    const base = String(creds.baseUrl || "https://api.nukebg.com").replace(/\/$/, "");

    for (let i = 0; i < items.length; i++) {
      try {
        const operation = this.getNodeParameter("operation", i) as string;
        if (operation === "account") {
          const res = (await this.helpers.httpRequestWithAuthentication.call(this, "nukeBgApi", { method: "GET", url: `${base}/v1/account`, json: true })) as IDataObject;
          delete res.webhook_secret;
          out.push({ json: res, pairedItem: { item: i } });
          continue;
        }

        // Image input: JSON body with a URL or base64 (no multipart needed).
        const body: IDataObject = {};
        let fileName = "image";
        if (this.getNodeParameter("inputType", i) === "url") {
          body.image_url = this.getNodeParameter("imageUrl", i) as string;
          fileName = String(body.image_url).split("/").pop()?.split("?")[0] || fileName;
        } else {
          const field = this.getNodeParameter("binaryPropertyName", i) as string;
          const meta = this.helpers.assertBinaryData(i, field);
          body.image_file_b64 = (await this.helpers.getBinaryDataBuffer(i, field)).toString("base64");
          fileName = meta.fileName ?? fileName;
        }

        let path: string;
        if (operation === "removeBackground") {
          path = "/v1/cutouts";
          const o = this.getNodeParameter("options", i, {}) as IDataObject;
          for (const k of ["background", "size", "quality", "shadow", "format"]) if (o[k] !== undefined && o[k] !== "") body[k] = o[k];
          if (o.size === "original") delete body.size;
          if (o.crop) body.crop = true;
          if (o.mainSubject) body.subject = "main";
        } else if (operation === "erase") {
          path = "/v1/erase";
          body.prompt = this.getNodeParameter("prompt", i) as string;
        } else if (operation === "upscale") {
          path = "/v1/upscale";
          body.scale = this.getNodeParameter("scale", i) as number;
        } else {
          throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, { itemIndex: i });
        }

        const req: IHttpRequestOptions = {
          method: "POST",
          url: `${base}${path}`,
          // Not json: true. n8n would add "Accept: application/json", and the API would answer with
          // base64 JSON instead of the image bytes we want here.
          body: JSON.stringify(body),
          encoding: "arraybuffer",
          returnFullResponse: true,
          headers: {
            "Content-Type": "application/json",
            Accept: "image/png, image/jpeg, image/webp",
            // A fresh key per call: execution/node/item ids repeat when the node runs in a loop.
            "Idempotency-Key": `n8n-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}-${i}`,
          },
        };
        const res = (await this.helpers.httpRequestWithAuthentication.call(this, "nukeBgApi", req)) as { body: ArrayBuffer | Buffer; headers: Record<string, string> };
        const data = Buffer.isBuffer(res.body) ? res.body : Buffer.from(res.body);
        const mime = res.headers["content-type"] ?? "image/png";
        const ext = mime === "image/jpeg" ? "jpg" : (mime.split("/")[1] ?? "png");
        const stem = fileName.replace(/\.[^.]+$/, "") || "image";
        const output = this.getNodeParameter("outputPropertyName", i) as string;

        out.push({
          json: {
            width: Number(res.headers["x-width"]),
            height: Number(res.headers["x-height"]),
            creditsCharged: Number(res.headers["x-credits-charged"] ?? 0),
            creditsRemaining: Number(res.headers["x-credits-remaining"]),
            foreground: res.headers["x-foreground"] ?? null,
            requestId: res.headers["x-request-id"] ?? null,
          },
          binary: { [output]: await this.helpers.prepareBinaryData(data, `${stem}-nukebg.${ext}`, mime) },
          pairedItem: { item: i },
        });
      } catch (error) {
        if (this.continueOnFail()) {
          out.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
          continue;
        }
        if (error instanceof NodeOperationError) throw new NodeOperationError(this.getNode(), error, { itemIndex: i });
        throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex: i });
      }
    }
    return [out];
  }
}
