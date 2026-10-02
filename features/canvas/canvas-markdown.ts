import { getSchema } from "@tiptap/core";
import { MarkdownManager } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import type { Node } from "@tiptap/pm/model";

const markdown = new MarkdownManager({ extensions: [StarterKit] });
const schema = getSchema([StarterKit]);
export function canvasDocumentPlainText(document: Node) {
  return document.textBetween(0, document.content.size, "\n", (node) => node.type.name === "horizontalRule" ? "---" : "");
}

export function canvasMarkdownPlainText(value: string) {
  const document = schema.nodeFromJSON(markdown.parse(value));
  return canvasDocumentPlainText(document);
}
