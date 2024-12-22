import readingTime from "reading-time";
import {
  type CollectionBeforeValidateHook,
  type CollectionConfig,
} from "payload";
import slugify from "@sindresorhus/slugify";

const beforeValidateHook: CollectionBeforeValidateHook = async ({ data }) => {
  if (data) {
    if (data.title) {
      data.slug = slugify(data.title);
    }

    // if (data.status === "scheduled" && data.scheduledPublishDate) {
    //   const scheduledDate = new Date(data.scheduledPublishDate);
    //
    //   if (scheduledDate <= new Date()) {
    //     data.status = "published";
    //     data.publishedAt = scheduledDate.toISOString();
    //   }
    // }
    //
    // if (data.status === "published" && !data.publishedAt) {
    //   data.publishedAt = new Date().toISOString();
    // }
    //
    // if (data.status !== "published") {
    //   data.publishedAt = null;
    // }

    if (data.content) {
      data.readingTime = Math.ceil(readingTime(data.content).minutes);
    }
  }

  return data;
};

const Posts: CollectionConfig = {
  slug: "posts",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "slug"],
  },
  versions: {
    drafts: {
      autosave: true,
    },
  },
  fields: [
    {
      name: "title",
      type: "text",
      required: true,
    },
    {
      name: "slug",
      type: "text",
      unique: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: "content",
      type: "richText",
    },
    {
      name: "excerpt",
      type: "textarea",
      label: "Excerpt/Summary",
      admin: {
        description:
          "A brief summary of the post (recommended: 100-160 characters)",
      },
      validate: (value) => {
        if (value && value.length > 250) {
          return "Excerpt should be 250 characters or less";
        }
        return true;
      },
    },
    {
      name: "metaDescription",
      type: "textarea",
      label: "Meta Description",
      admin: {
        description:
          "A brief summary for search engines (recommended: 150-160 characters)",
      },
      validate: (value) => {
        if (value && value.length > 160) {
          return "Meta description should be 160 characters or less";
        }
        return true;
      },
    },
    {
      name: "category",
      type: "relationship",
      relationTo: "categories", // You'll need to create a Categories collection
      required: true,
    },
    {
      name: "tags",
      type: "relationship",
      relationTo: "tags", // You'll need to create a Tags collection
      hasMany: true,
      required: false,
    },
    {
      name: "readingTime",
      type: "number",
      admin: {
        hidden: true,
      },
    },
    // {
    //   name: "status",
    //   type: "radio",
    //   options: [
    //     { label: "Draft", value: "draft" },
    //     { label: "Published", value: "published" },
    //     { label: "Scheduled", value: "scheduled" },
    //   ],
    //   defaultValue: "draft",
    //   admin: {
    //     layout: "horizontal",
    //   },
    // },
    {
      name: "scheduledPublishDate",
      type: "date",
      label: "Scheduled Published Date",
      admin: {
        date: { pickerAppearance: "dayAndTime" },
        condition: (data) => data.status === "scheduled",
      },
      required: false,
    },
    {
      name: "publishedAt",
      type: "date",
      admin: {
        date: {
          pickerAppearance: "dayAndTime",
        },
      },
      hooks: {
        beforeValidate: [
          ({ value, operation }) => {
            if (operation === "create") {
              return new Date().toISOString();
            }
            return value;
          },
        ],
      },
    },
    {
      name: "featuredImage",
      type: "relationship",
      relationTo: "media",
      hasMany: true,
      required: false,
    },
    {
      name: "isFeatured",
      type: "checkbox",
      label: "Featured Post",
      admin: {
        description: "Mark this post as a featured post to highlight it",
      },
      defaultValue: false,
    },
  ],
  hooks: {
    beforeValidate: [beforeValidateHook],
  },
};

export default Posts;
