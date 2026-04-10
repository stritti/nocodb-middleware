import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs/promises";
import path from "path";

// robust way to get root directory
const PROJECT_ROOT = process.cwd();

/**
 * MCP Server for NocoDB Middleware
 * Adapted to use NocoDB V3 (Data and Meta) API
 */
const server = new Server(
  {
    name: "nocodb-middleware-mcp",
    version: "1.1.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {},
    },
  }
);

// -----------------------------------------
// HELPERS
// -----------------------------------------

/**
 * Loads environment variables from the first found .env file
 */
async function loadEnv() {
  const envFiles = [".env", ".env.local", ".env.development"];
  for (const file of envFiles) {
    try {
      const filePath = path.join(PROJECT_ROOT, file);
      const content = await fs.readFile(filePath, "utf-8");
      content.split("\n").forEach((line) => {
        const [key, ...valueParts] = line.split("=");
        if (key && valueParts.length > 0 && !key.startsWith("#")) {
          const value = valueParts.join("=").trim().replace(/^["']|["']$/g, "");
          process.env[key.trim()] = value;
        }
      });
      console.error(`Loaded env from ${file}`);
      return; 
    } catch (e) {
      // Ignore errors if file not found
    }
  }
}

function getNocoConfig() {
  const baseUrl = process.env.NOCODB_API_URL || "http://localhost:8080";
  const token = process.env.NOCODB_API_TOKEN;
  const baseId = process.env.NOCODB_BASE_ID;

  if (!token || !baseId) {
    throw new Error("Missing NOCODB_API_TOKEN or NOCODB_BASE_ID in environment.");
  }

  return { baseUrl, token, baseId };
}

// -----------------------------------------
// RESOURCES
// -----------------------------------------
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "file:///README.md",
        name: "Project README",
        mimeType: "text/markdown",
        description: "The main README of the nocodb-middleware project.",
      },
      {
        uri: "file:///package.json",
        name: "Project package.json",
        mimeType: "application/json",
        description: "The package.json outlining dependencies and scripts.",
      },
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;
  if (uri === "file:///README.md") {
    const content = await fs.readFile(path.join(PROJECT_ROOT, "README.md"), "utf-8");
    return { contents: [{ uri, mimeType: "text/markdown", text: content }] };
  }
  if (uri === "file:///package.json") {
    const content = await fs.readFile(path.join(PROJECT_ROOT, "package.json"), "utf-8");
    return { contents: [{ uri, mimeType: "application/json", text: content }] };
  }
  throw new Error(`Resource not found: ${uri}`);
});

// -----------------------------------------
// TOOLS
// -----------------------------------------
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_project_structure",
        description: "Returns the top-level directory structure of the project.",
        inputSchema: { type: "object", properties: {}, required: [] },
      },
      {
        name: "read_env_keys",
        description: "Returns existing keys in current .env files (without values).",
        inputSchema: { type: "object", properties: {}, required: [] },
      },
      {
        name: "nocodb_query",
        description: "Queries NocoDB V3 Data API for records of a specific table ID or Name.",
        inputSchema: {
          type: "object",
          properties: {
            tableId: { type: "string", description: "The Table ID or table name (e.g. 'users' or 'm4w...')." },
            limit: { type: "number", description: "Max records to return.", default: 10 },
            where: { type: "string", description: "Filter condition (NocoDB query syntax)." },
            sort: { type: "string", description: "Sort condition (e.g. '-CreatedAt')." }
          },
          required: ["tableId"],
        },
      },
      {
        name: "nocodb_list_tables",
        description: "Lists all tables in the configured NocoDB base using V3 Meta API.",
        inputSchema: { type: "object", properties: {}, required: [] },
      },
      {
        name: "nocodb_get_table_columns",
        description: "Returns columns/fields for a specific table using V3 Meta API.",
        inputSchema: {
          type: "object",
          properties: {
            tableId: { type: "string", description: "The Table ID (e.g. m4wto2nnf9c230g)." }
          },
          required: ["tableId"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "get_project_structure") {
      const files = await fs.readdir(PROJECT_ROOT);
      return { content: [{ type: "text", text: JSON.stringify(files, null, 2) }] };
    }

    if (name === "read_env_keys") {
      const envKeys = Object.keys(process.env).filter(k => 
        k.startsWith("NOCODB_") || k.includes("PORT") || k.includes("JWT")
      );
      return { content: [{ type: "text", text: `Active Environment Keys (Metadata Filtered):\n${envKeys.join("\n")}` }] };
    }

    const { baseUrl, token, baseId } = getNocoConfig();

    if (name === "nocodb_query") {
      const tableId = String(args?.tableId);
      const limit = Number(args?.limit) || 10;
      const where = args?.where ? `&where=${encodeURIComponent(String(args.where))}` : "";
      const sort = args?.sort ? `&sort=${encodeURIComponent(String(args.sort))}` : "";

      const url = `${baseUrl}/api/v3/data/${baseId}/${tableId}/records?limit=${limit}${where}${sort}`;
      const res = await fetch(url, {
        headers: { "xc-token": token, "Content-Type": "application/json" }
      });
      if (!res.ok) throw new Error(`NocoDB Error: ${res.status} ${await res.text()}`);
      
      const data = await res.json();
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    if (name === "nocodb_list_tables") {
      const url = `${baseUrl}/api/v3/meta/bases/${baseId}/tables`;
      const res = await fetch(url, {
        headers: { "xc-token": token, "Content-Type": "application/json" }
      });
      if (!res.ok) throw new Error(`NocoDB Error: ${res.status} ${await res.text()}`);
      
      const data = await res.json();
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    if (name === "nocodb_get_table_columns") {
      const tableId = String(args?.tableId);
      const url = `${baseUrl}/api/v3/meta/tables/${tableId}/columns`;
      const res = await fetch(url, {
        headers: { "xc-token": token, "Content-Type": "application/json" }
      });
      if (!res.ok) throw new Error(`NocoDB Error: ${res.status} ${await res.text()}`);
      
      const data = await res.json();
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    throw new Error(`Tool not implemented: ${name}`);
  } catch (e: any) {
    return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
  }
});

// -----------------------------------------
// PROMPTS
// -----------------------------------------
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: "analyze_project",
        description: "Analyze middle-ware project and its NocoDB V3 integration.",
      },
    ],
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  if (request.params.name === "analyze_project") {
    return {
      description: "Analyze the nocodb-middleware project.",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: "Please analyze the nocodb-middleware project structure and suggest improvements for its NocoDB V3 integration.",
          },
        },
      ],
    };
  }
  throw new Error(`Unknown prompt: ${request.params.name}`);
});

// -----------------------------------------
// MAIN
// -----------------------------------------
async function main() {
  await loadEnv();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Server for nocodb-middleware running on stdio");
}

main().catch((error) => {
  console.error("Server fatal error:", error);
  process.exit(1);
});
