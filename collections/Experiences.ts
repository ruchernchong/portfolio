import type { CollectionConfig } from "payload";

const Experiences: CollectionConfig = {
  slug: "experiences",
  fields: [
    {
      name: "jobTitle",
      type: "text",
      required: true,
    },
    {
      name: "company",
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
      name: "description",
      type: "textarea",
      required: true,
    },
  ],
};

export default Experiences;
