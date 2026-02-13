import { hyperlink } from "discord.js";

const TYPEDOC_URL = "https://loathers.github.io/libram/typedoc.json";

type TypedocComment = {
  summary?: { kind: string; text: string }[];
  blockTags?: {
    tag: string;
    name?: string;
    content: { kind: string; text: string }[];
  }[];
};

type TypedocType = {
  type: string;
  name?: string;
  value?: string | number | boolean;
  types?: TypedocType[];
  elementType?: TypedocType;
  elements?: TypedocType[];
  target?: number | { qualifiedName?: string; packageName?: string };
  operator?: string;
  package?: string;
  queryType?: TypedocType;
  indexType?: TypedocType;
  objectType?: TypedocType;
  declaration?: TypedocDeclaration;
  typeArguments?: TypedocType[];
};

type TypedocParameter = {
  id: number;
  name: string;
  kind: number;
  flags: Record<string, boolean>;
  comment?: TypedocComment;
  type?: TypedocType;
  defaultValue?: string;
};

type TypedocSignature = {
  id: number;
  name: string;
  kind: number;
  flags: Record<string, boolean>;
  comment?: TypedocComment;
  parameters?: TypedocParameter[];
  typeParameters?: { id: number; name: string; type?: TypedocType }[];
  type?: TypedocType;
  sources?: TypedocSource[];
};

type TypedocSource = {
  fileName: string;
  line: number;
  character: number;
  url?: string;
};

type TypedocGroup = {
  title: string;
  children: number[];
};

type TypedocDeclaration = {
  id: number;
  name: string;
  variant: string;
  kind: number;
  flags: Record<string, boolean>;
  comment?: TypedocComment;
  children?: TypedocDeclaration[];
  groups?: TypedocGroup[];
  signatures?: TypedocSignature[];
  sources?: TypedocSource[];
  type?: TypedocType;
  defaultValue?: string;
  target?: number;
};

export type TypedocRoot = {
  schemaVersion: string;
  children: TypedocDeclaration[];
};

// Kind constants from TypeDoc
const Kind = {
  Namespace: 4,
  Enum: 8,
  EnumMember: 16,
  Class: 128,
  Interface: 256,
  Property: 1024,
  Method: 2048,
  TypeAlias: 2097152,
  Variable: 32,
  Function: 64,
  Reference: 4194304,
} as const;

export type TopicKind =
  | "Namespace"
  | "Enum"
  | "Class"
  | "Interface"
  | "Variable"
  | "Function"
  | "Type Alias"
  | "Re-export"
  | "Unknown";

export type LibramTopic = {
  name: string;
  kind: TopicKind;
  declaration: TypedocDeclaration;
};

function kindLabel(kind: number): TopicKind {
  switch (kind) {
    case Kind.Namespace:
      return "Namespace";
    case Kind.Enum:
      return "Enum";
    case Kind.Class:
      return "Class";
    case Kind.Interface:
      return "Interface";
    case Kind.Variable:
      return "Variable";
    case Kind.Function:
      return "Function";
    case Kind.TypeAlias:
      return "Type Alias";
    case Kind.Reference:
      return "Re-export";
    default:
      return "Unknown";
  }
}

export function parseTopics(data: TypedocRoot): LibramTopic[] {
  return data.children.map((child) => ({
    name: child.name,
    kind: kindLabel(child.kind),
    declaration: child,
  }));
}

function renderCommentText(content: { kind: string; text: string }[]): string {
  return content
    .map((c) => (c.kind === "code" ? `\`${c.text}\`` : c.text))
    .join("");
}

export function renderType(type: TypedocType | undefined): string {
  if (!type) return "unknown";

  switch (type.type) {
    case "intrinsic":
      return type.name ?? "unknown";
    case "literal":
      return type.value === undefined
        ? "undefined"
        : typeof type.value === "string"
          ? `"${type.value}"`
          : String(type.value);
    case "reference": {
      let name = type.name ?? "unknown";
      if (type.typeArguments?.length) {
        name += `<${type.typeArguments.map(renderType).join(", ")}>`;
      }
      return name;
    }
    case "union":
      return (type.types ?? []).map(renderType).join(" | ");
    case "intersection":
      return (type.types ?? []).map(renderType).join(" & ");
    case "array":
      return `${renderType(type.elementType)}[]`;
    case "tuple":
      return `[${(type.elements ?? []).map(renderType).join(", ")}]`;
    case "typeOperator":
      return `${type.operator} ${renderType(type.target as unknown as TypedocType)}`;
    case "indexedAccess":
      return `${renderType(type.objectType)}[${renderType(type.indexType)}]`;
    case "query":
      return `typeof ${renderType(type.queryType)}`;
    case "reflection":
      return renderReflectionType(type.declaration);
    case "predicate":
      return `${type.name} is ${renderType(type.target as unknown as TypedocType)}`;
    case "mapped":
    case "conditional":
    case "templateLiteral":
      return "complex type";
    default:
      return type.type;
  }
}

function renderReflectionType(
  declaration: TypedocDeclaration | undefined,
): string {
  if (!declaration) return "object";
  if (declaration.signatures?.length) {
    const sig = declaration.signatures[0];
    const params = (sig.parameters ?? [])
      .map((p) => `${p.name}: ${renderType(p.type)}`)
      .join(", ");
    return `(${params}) => ${renderType(sig.type)}`;
  }
  return "object";
}

function renderSignature(sig: TypedocSignature, name: string): string {
  const typeParams = sig.typeParameters?.length
    ? `<${sig.typeParameters.map((t) => t.name).join(", ")}>`
    : "";
  const params = (sig.parameters ?? [])
    .map((p) => {
      const optional = p.flags.isOptional ? "?" : "";
      const defaultVal = p.defaultValue != null ? ` = ${p.defaultValue}` : "";
      return `${p.name}${optional}: ${renderType(p.type)}${defaultVal}`;
    })
    .join(", ");
  const returnType = renderType(sig.type);
  return `${name}${typeParams}(${params}): ${returnType}`;
}

const EMBED_DESCRIPTION_LIMIT = 4096;
const EMBED_FIELD_VALUE_LIMIT = 1024;
const EMBED_TOTAL_LIMIT = 6000;

function truncate(text: string, limit: number): string {
  if (text.length <= limit) return text;
  return text.slice(0, limit - 3) + "...";
}

type EmbedData = {
  title: string;
  url: string | null;
  description: string;
  fields: { name: string; value: string; inline?: boolean }[];
};

function truncateEmbed(embed: EmbedData): EmbedData {
  let description = truncate(embed.description, EMBED_DESCRIPTION_LIMIT);
  const fields = embed.fields.map((f) => ({
    ...f,
    value: truncate(f.value, EMBED_FIELD_VALUE_LIMIT),
  }));

  // Check total character count (title + description + all field names + values)
  const totalChars = () =>
    embed.title.length +
    description.length +
    fields.reduce((sum, f) => sum + f.name.length + f.value.length, 0);

  // Drop fields from the end if we exceed the total limit
  while (fields.length > 0 && totalChars() > EMBED_TOTAL_LIMIT) {
    fields.pop();
  }

  // If still over, truncate description further
  if (totalChars() > EMBED_TOTAL_LIMIT) {
    const available = EMBED_TOTAL_LIMIT - embed.title.length;
    description = truncate(description, Math.max(available, 100));
  }

  return { ...embed, description, fields };
}

export function formatTopicEmbed(topic: LibramTopic): {
  title: string;
  url: string | null;
  description: string;
  fields: { name: string; value: string; inline?: boolean }[];
} {
  const { name, declaration } = topic;
  const sourceUrl = declaration.sources?.[0]?.url ?? null;

  const fields: { name: string; value: string; inline?: boolean }[] = [];
  const lines: string[] = [];

  // Add comment description
  const comment = getComment(declaration);
  if (comment?.summary?.length) {
    lines.push(renderCommentText(comment.summary));
  }

  switch (declaration.kind) {
    case Kind.Function:
      formatFunction(declaration, name, lines, fields, comment);
      break;
    case Kind.Variable:
      formatVariable(declaration, lines, fields);
      break;
    case Kind.Class:
      formatClass(declaration, fields);
      break;
    case Kind.Namespace:
      formatNamespace(declaration, fields);
      break;
    case Kind.Enum:
      formatEnum(declaration, fields);
      break;
    case Kind.Interface:
      formatNamespace(declaration, fields);
      break;
    case Kind.TypeAlias:
      formatTypeAlias(declaration, lines, fields);
      break;
    case Kind.Reference:
      lines.push(`*Re-exported from libram internals*`);
      break;
  }

  if (sourceUrl) {
    const fileName = declaration.sources?.[0]?.fileName ?? "";
    const line = declaration.sources?.[0]?.line;
    const location = line ? `${fileName}:${line}` : fileName;
    lines.push(hyperlink(`View source (${location})`, sourceUrl));
  }

  const title = name;
  const description = lines.join("\n\n") || "*No description available*";

  return truncateEmbed({ title, url: sourceUrl, description, fields });
}

function getComment(
  declaration: TypedocDeclaration,
): TypedocComment | undefined {
  return (
    declaration.comment ?? declaration.signatures?.[0]?.comment ?? undefined
  );
}

function formatFunction(
  declaration: TypedocDeclaration,
  name: string,
  lines: string[],
  fields: { name: string; value: string; inline?: boolean }[],
  comment: TypedocComment | undefined,
) {
  const signatures = declaration.signatures ?? [];

  if (signatures.length > 0) {
    const sigLines = signatures.map((sig) => renderSignature(sig, name));
    lines.push("```ts\n" + sigLines.join("\n") + "\n```");
  }

  // Add parameter descriptions from comment
  const paramTags = comment?.blockTags?.filter((t) => t.tag === "@param") ?? [];
  if (paramTags.length > 0) {
    const paramDesc = paramTags
      .map((t) => `**${t.name}**: ${renderCommentText(t.content)}`)
      .join("\n");
    fields.push({ name: "Parameters", value: paramDesc });
  }

  // Add return description
  const returnTag = comment?.blockTags?.find((t) => t.tag === "@returns");
  if (returnTag) {
    fields.push({
      name: "Returns",
      value: renderCommentText(returnTag.content),
    });
  }
}

function formatVariable(
  declaration: TypedocDeclaration,
  lines: string[],
  fields: { name: string; value: string; inline?: boolean }[],
) {
  const typeStr = renderType(declaration.type);
  lines.push(`**Type**: \`${typeStr}\``);

  if (declaration.defaultValue != null) {
    const val =
      declaration.defaultValue.length > 200
        ? declaration.defaultValue.slice(0, 200) + "..."
        : declaration.defaultValue;
    fields.push({ name: "Default Value", value: `\`\`\`ts\n${val}\n\`\`\`` });
  }
}

function formatClass(
  declaration: TypedocDeclaration,
  fields: { name: string; value: string; inline?: boolean }[],
) {
  const children = declaration.children ?? [];

  const properties = children.filter((c) => c.kind === Kind.Property);
  const methods = children.filter((c) => c.kind === Kind.Method);
  const staticMethods = methods.filter((m) => m.flags.isStatic);
  const instanceMethods = methods.filter((m) => !m.flags.isStatic);

  if (properties.length > 0) {
    fields.push({
      name: "Properties",
      value: properties
        .map((p) => `\`${p.name}\`: ${renderType(p.type)}`)
        .join("\n"),
    });
  }

  if (staticMethods.length > 0) {
    fields.push({
      name: "Static Methods",
      value: staticMethods.map((m) => `\`${m.name}()\``).join(", "),
    });
  }

  if (instanceMethods.length > 0) {
    fields.push({
      name: "Instance Methods",
      value: instanceMethods.map((m) => `\`${m.name}()\``).join(", "),
    });
  }
}

function formatNamespaceFunctions(children: TypedocDeclaration[]): string {
  const sigLines: string[] = [];
  for (const child of children) {
    for (const sig of child.signatures ?? []) {
      sigLines.push(renderSignature(sig, child.name));
    }
  }
  if (sigLines.length === 0) return "";
  return "```ts\n" + sigLines.join("\n") + "\n```";
}

function formatNamespace(
  declaration: TypedocDeclaration,
  fields: { name: string; value: string; inline?: boolean }[],
) {
  const groups = declaration.groups ?? [];
  const children = declaration.children ?? [];
  const childById = new Map(children.map((c) => [c.id, c]));

  for (const group of groups) {
    const groupChildren = group.children
      .map((id) => childById.get(id))
      .filter((c): c is TypedocDeclaration => !!c);

    if (groupChildren.length === 0) continue;

    let value: string;
    if (group.title === "Functions") {
      value = formatNamespaceFunctions(groupChildren);
    } else {
      value = groupChildren.map((c) => `\`${c.name}\``).join(", ");
    }

    if (!value) continue;

    fields.push({
      name: group.title,
      value: value.length > 1024 ? value.slice(0, 1021) + "..." : value,
    });
  }
}

function formatEnum(
  declaration: TypedocDeclaration,
  fields: { name: string; value: string; inline?: boolean }[],
) {
  const members = (declaration.children ?? []).filter(
    (c) => c.kind === Kind.EnumMember,
  );
  if (members.length > 0) {
    const value = members
      .map((m) => {
        const val =
          m.type?.type === "literal"
            ? ` = ${JSON.stringify(m.type.value)}`
            : "";
        return `\`${m.name}${val}\``;
      })
      .join(", ");
    fields.push({
      name: "Members",
      value: value.length > 1024 ? value.slice(0, 1021) + "..." : value,
    });
  }
}

function formatTypeAlias(
  declaration: TypedocDeclaration,
  lines: string[],
  fields: { name: string; value: string; inline?: boolean }[],
) {
  const typeStr = renderType(declaration.type);
  if (typeStr.length < 200) {
    lines.push(`\`\`\`ts\ntype ${declaration.name} = ${typeStr}\n\`\`\``);
  }

  // If it has children (object-like type alias), show them
  if (declaration.children?.length) {
    const propList = declaration.children
      .map((c) => `\`${c.name}\`: ${renderType(c.type)}`)
      .join("\n");
    fields.push({ name: "Properties", value: propList });
  }
}

let topicsCache: LibramTopic[] | null = null;

export async function fetchTopics(): Promise<LibramTopic[]> {
  if (topicsCache) return topicsCache;

  const response = await fetch(TYPEDOC_URL);
  const data = (await response.json()) as TypedocRoot;
  topicsCache = parseTopics(data);
  return topicsCache;
}

export function resolveReference(
  topics: LibramTopic[],
  declaration: TypedocDeclaration,
): TypedocDeclaration {
  if (declaration.kind !== Kind.Reference || declaration.target == null)
    return declaration;

  // Search all topics for the target id
  for (const topic of topics) {
    const found = findById(topic.declaration, declaration.target);
    if (found) return found;
  }

  return declaration;
}

function findById(
  node: TypedocDeclaration,
  id: number,
): TypedocDeclaration | null {
  if (node.id === id) return node;
  for (const child of node.children ?? []) {
    const found = findById(child, id);
    if (found) return found;
  }
  return null;
}
