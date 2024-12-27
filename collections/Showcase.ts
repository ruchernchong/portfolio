import type { CollectionConfig } from "payload";

const Showcase: CollectionConfig = {
  slug: "showcase",
  fields: [
    {
      name: "title",
      type: "text",
      required: true,
    },
    {
      name: "description",
      type: "textarea",
      required: true,
    },
    {
      name: "technologies",
      type: "array",
      required: true,
      fields: [{ name: "technology", type: "text" }],
    },
    {
      name: "link",
      type: "text",
      required: true,
    },
    {
      name: "image",
      type: "upload",
      relationTo: "media",
    },
  ],
};

export default Showcase; // Updated export name
