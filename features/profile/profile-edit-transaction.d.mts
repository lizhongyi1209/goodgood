import type { PersonalProfile, ProfileInput } from "./personal-profile";
export function commitProfileEdit(options: {
  profile: PersonalProfile; kind: "name" | "avatar"; name?: string; file?: File | null; removeAvatar?: boolean;
  uploadAvatar: (file: File, signal?: AbortSignal) => Promise<{ id: string }>;
  save: (input: ProfileInput, signal?: AbortSignal) => Promise<PersonalProfile>;
  signal?: AbortSignal;
}): Promise<PersonalProfile>;
