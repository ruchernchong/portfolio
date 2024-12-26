import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { buildConfig } from "payload";
import sharp from "sharp";
import Media from "./collections/Media";
import Categories from "./collections/Categories";
import Posts from "./collections/Posts";
import Tags from "./collections/Tags";
import Showcase from "./collections/Showcase";
import Experiences from "./collections/Experiences";
import Education from "./collections/Education";
import { s3Storage } from "@payloadcms/storage-s3";
import Users from "./collections/Users";

export default buildConfig({
  editor: lexicalEditor(),
  collections: [
    Categories,
    Media,
    Posts,
    Tags,
    Showcase,
    Experiences,
    Education,
    Users,
  ],
  plugins: [
    s3Storage({
      collections: {
        media: {
          prefix: "media",
        },
      },
      bucket: process.env.S3_BUCKET ?? "",
      config: {
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
        },
        region: process.env.S3_REGION,
      },
    }),
  ],
  secret: process.env.PAYLOAD_SECRET ?? "",
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL,
    },
  }),
  sharp,
  admin: {
    livePreview: {
      url: ({ data }) =>
        `${process.env.NEXT_PUBLIC_BASE_URL}/posts/${data.slug}`,
      collections: ["posts"],
    },
  },
});
