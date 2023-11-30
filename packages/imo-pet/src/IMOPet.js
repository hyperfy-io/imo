import { IMO } from "./IMO";

const defaultSpec = {
  type: "pet",
  version: "1.0.0",
  name: "",
  description: "",
  speed: 3,
  emotes: [],
};

export class IMOPet extends IMO {
  constructor() {
    super(defaultSpec);
  }

  isValid() {
    const spec = this.spec;
    if (spec.type !== "pet") return false;
    if (!spec.version) return false;
    if (!spec.name) return false;
    if (!spec.description) return false;
    if (!spec.speed) return false;
    for (const emote of spec.emotes) {
      if (!emote.name) return false;
      if (!emote.animation) return false;
    }
    return true;
  }
}
