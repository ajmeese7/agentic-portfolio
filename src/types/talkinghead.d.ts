declare module "@met4citizen/talkinghead" {
  import type { Camera, Group } from "three";

  export interface TalkingHeadOptions {
    avatarOnly?: boolean;
    avatarOnlyCamera?: Camera;
    lipsyncModules?: string[];
    ttsEndpoint?: string;
    [key: string]: unknown;
  }

  export interface ShowAvatarOptions {
    url: string;
    body?: "M" | "F";
    avatarMood?: "neutral" | "happy" | "angry" | "sad" | "fear" | "disgust" | "love" | "sleep";
    lipsyncLang?: string;
    ttsLang?: string;
    ttsVoice?: string;
    retarget?: Record<string, Record<string, number>>;
    baseline?: Record<string, number>;
    [key: string]: unknown;
  }

  export class TalkingHead {
    constructor(node: HTMLElement, options?: TalkingHeadOptions);
    armature: Group;
    showAvatar(opts: ShowAvatarOptions, onProgress?: (e: ProgressEvent) => void): Promise<void>;
    animate(deltaMs: number): void;
    speakText(text: string): void;
  }
}
