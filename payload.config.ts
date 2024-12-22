import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { buildConfig } from "payload";
import sharp from "sharp";
import Posts from "./collections/Posts";
import { s3Storage } from "@payloadcms/storage-s3";
import Media from "./collections/Media";

export default buildConfig({
  editor: lexicalEditor(),
  collections: [Media, Posts],
  plugins: [
    s3Storage({
      collections: {
        media: {
          prefix: "media",
        },
      },
      bucket: process.env.S3_BUCKET!,
      config: {
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID!,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
        },
        region: process.env.S3_REGION,
      },
    }),
  ],
  secret: process.env.PAYLOAD_SECRET || "",
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL,
    },
  }),
  sharp,
});
