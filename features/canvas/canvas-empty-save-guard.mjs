function pages(document) {
  return document.schemaVersion === 2 ? document.pages : [{ ...document, id: "page-1" }];
}

/** @param {ReadonlySet<string>} [approvedPageIds] */
export function unapprovedEmptyCanvasPages(previous, next, approvedPageIds = new Set()) {
  const previousPages = new Map(pages(previous).map((page) => [page.id, page]));
  return pages(next).filter((page) => page.nodes.length === 0 &&
    previousPages.get(page.id)?.nodes.length > 0 && !approvedPageIds.has(page.id)).map((page) => page.id);
}
