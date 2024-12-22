import type { CollectionConfig } from "payload";

const Tags: CollectionConfig = {
  slug: "tags",
  admin: {
    useAsTitle: "name",
  },
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
    },
    {
      name: "color",
      type: "text",
      admin: {
        description: "Optional color for tag display (hex code)",
      },
      required: false,
    },
  ],
};

export default Tags;
