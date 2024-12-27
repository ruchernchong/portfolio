import readingTime from "reading-time";
import {
  type CollectionBeforeValidateHook,
  type CollectionConfig,
} from "payload";
import slugify from "@sindresorhus/slugify";
import type { BlogPosting, WithContext } from "schema-dts";

const beforeValidateHook: CollectionBeforeValidateHook = async ({
  req,
  data,
}) => {
  if (data) {
    let author;
    if (req.user) {
      const user = req.user;
      author = `${user.firstName} ${user.lastName}`;
      data.author = author;
    }

    if (data.title) {
      const slug = slugify(data.title);
      data.slug = slug;
      data.url = `${process.env.NEXT_PUBLIC_BASE_URL}/posts/${slug}`;
    }

    // if (data.status === "scheduled" && data.scheduledPublishDate) {
    //   const scheduledDate = new Date(data.scheduledPublishDate);
    //
    //   if (scheduledDate <= new Date()) {
    //     data.status = "published";
    //     data.publishedAt = scheduledDate.toISOString();
    //   }
    // }

    if (data.content) {
      data.readingTime = Math.ceil(readingTime(data.content).minutes);
    }

    // Generate Structured Data
    if (data.title && data.content) {
      // Generate SEO metadata
      data.meta = {
        title: data.title,
        description: data.excerpt ?? data.content.substring(0, 160),
      };
      data.seoTitle = data.title;

      // Generate OpenGraph metadata
      if (data.featuredImage) {
        data.ogImage = data.featuredImage;
      }

      data.opengraph = {
        // Basic OpenGraph properties
        "og:title": data.title,
        "og:type": "article",
        "og:description": data.excerpt ?? data.content.subString(0, 160),
        "og:url": data.url,
        "og:image": data.featuredImage,
        "og:locale": "en_SG",
        "og:site_name": "Ru Chern",

        // Article-specific properties
        "article:published_time": data.publishedAt,
        "article:modified_time": data.modifiedAt,
      };

      data.twitter = {
        card: "summary_large_image",
        site: "@ruchernchong",
        title: data.title,
        description: data.excerpt,
        image: data.featuredImage,
      };

      data.structuredData = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: data.title,
        author: {
          "@type": "Person",
          name: author,
        },
        datePublished: data.publishedAt,
        description: data.excerpt,
        articleBody: data.excerpt,
        url: data.url,
        image: data.featuredImage,
      } satisfies WithContext<BlogPosting>;
    }
  }

  return data;
};

const Posts: CollectionConfig = {
  slug: "posts",
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
      admin: { readOnly: true },
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
      name: "category",
      type: "relationship",
      relationTo: "categories",
      // required: true,
    },
    {
      name: "tags",
      type: "relationship",
      relationTo: "tags",
      hasMany: true,
      required: false,
    },
    {
      name: "readingTime",
      type: "number",
      defaultValue: 0,
      admin: {
        hidden: true,
      },
    },
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
      type: "text",
      admin: { readOnly: true },
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
    {
      name: "canonicalUrl",
      type: "text",
      label: "Canonical Url",
      admin: { hidden: true },
    },
    {
      name: "meta",
      type: "json",
      label: "Meta",
      defaultValue: {},
      admin: { hidden: true },
    },
    {
      name: "opengraph",
      type: "json",
      label: "Opengraph",
      defaultValue: {},
      admin: { hidden: true },
    },
    {
      name: "twitter",
      type: "json",
      label: "Twitter",
      defaultValue: {},
      admin: { hidden: true },
    },
    {
      name: "structuredData",
      type: "json",
      label: "Structured Data",
      defaultValue: {},
      admin: { hidden: true },
    },
  ],
  hooks: {
    beforeValidate: [beforeValidateHook],
  },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "slug"],
    livePreview: {
      url: ({ data }) =>
        `${process.env.NEXT_PUBLIC_BASE_URL}/posts/${data.slug}`,
    },
  },
};

export default Posts;
