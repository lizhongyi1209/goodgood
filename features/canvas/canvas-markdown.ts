import { getSchema } from "@tiptap/core";
import { MarkdownManager } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";

const markdown = new MarkdownManager({ extensions: [StarterKit] });
const schema = getSchema([StarterKit]);
export function canvasMarkdownPlainText(value: string) {
  const document = schema.nodeFromJSON(markdown.parse(value));
  return document.textBetween(0, document.content.size, "\n");
}
