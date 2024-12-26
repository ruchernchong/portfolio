import type { CollectionConfig } from "payload";

const Education: CollectionConfig = {
  slug: "education",
  fields: [
    {
      name: "degree",
      type: "text",
      required: true,
    },
    {
      name: "institution",
      type: "text",
      required: true,
    },
    {
      name: "startDate",
      type: "date",
      required: true,
    },
    {
      name: "endDate",
      type: "date",
    },
    {
      name: "courses",
      type: "array",
      fields: [{ name: "course", type: "text" }],
    },
  ],
};

export default Education;
