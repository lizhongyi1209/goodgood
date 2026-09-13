/** Directory visibility is presentation only; manager APIs authorize each read. */
export function manageableOrganizations(workspaces) {
  return workspaces.filter((workspace) =>
    workspace.kind === "organization" && workspace.status === "active" &&
    workspace.membershipStatus === "active" &&
    (workspace.role === "org_owner" || workspace.role === "org_admin"),
  );
}

export function showOrganizationNavigation(session, workspaces, invitations) {
  return Boolean(session && !session.preview && session.access.status === "active" && (
    session.account.role === "site_owner" || session.account.businessRole === "enterprise" ||
    manageableOrganizations(workspaces).length || invitations.length
  ));
}
