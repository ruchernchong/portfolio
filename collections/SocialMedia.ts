import type { CollectionConfig } from "payload";

const SocialMedia: CollectionConfig = {
  slug: "social-media",
  fields: [
    {
      name: "platform",
      type: "text",
      required: true,
    },
    {
      name: "url",
      type: "text",
      required: true,
    },
    {
      name: "icon",
      type: "text",
    },
  ],
};

export default SocialMedia;
