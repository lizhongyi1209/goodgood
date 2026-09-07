function requireIdentityValue(value, name) {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > 500 ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new Error(`${name} must contain 1 to 500 safe characters`);
  }
  return value;
}

export function requireIdentityDeletionAdapter(adapter) {
  if (
    !adapter ||
    typeof adapter.disableIdentity !== "function" ||
    typeof adapter.deleteIdentity !== "function"
  ) {
    throw new Error(
      "An identity deletion adapter with disableIdentity and deleteIdentity is required.",
    );
  }
  return adapter;
}

export function externalIdentityTarget(identity) {
  return Object.freeze({
    issuer: requireIdentityValue(identity?.issuer, "identity.issuer"),
    subject: requireIdentityValue(identity?.subject, "identity.subject"),
  });
}
