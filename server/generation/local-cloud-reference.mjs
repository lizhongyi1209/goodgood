export const LOCAL_CLOUD_REFERENCE_PREFIX = "local-dev/references/";

export function isLocalCloudReference(key) {
  return typeof key === "string" && key.startsWith(LOCAL_CLOUD_REFERENCE_PREFIX);
}

export function newLocalCloudReferenceKey(key, cloudReference) {
  return cloudReference ? `local-dev/${key}` : key;
}

export function routeLocalCloudReferences(local, cloud, cloudBucket) {
  return {
    send(command) {
      const key = command.input?.Key;
      if (!isLocalCloudReference(key)) return local.send(command);
      if (!cloud) throw new Error("This reference needs the local cloud upload configuration.");
      return cloud.send(new command.constructor({
        ...command.input,
        Bucket: cloudBucket,
      }));
    },
    destroy() {
      local.destroy();
      cloud?.destroy();
    },
  };
}

export function cloudReferenceReadClient(publicStorage, key) {
  if (!isLocalCloudReference(key)) return null;
  const cloud = publicStorage.cloudReferenceClient;
  if (!cloud) throw new Error("This reference needs the local cloud upload configuration.");
  return cloud;
}
