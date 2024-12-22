import type { CollectionConfig } from "payload";

const Posts: CollectionConfig = {
  slug: "posts",
  admin: {
    useAsTitle: "title",
  },
  fields: [
    {
      name: "title",
      type: "text",
      required: true,
    },
    {
      name: "content",
      type: "richText",
    },
    {
      name: "publishedAt",
      type: "date",
    },
    {
      name: "featuredImage",
      type: "relationship",
      relationTo: "media",
      hasMany: true,
      required: false,
    },
  ],
};

export default Posts;
