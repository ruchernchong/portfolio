import { Suspense } from "react";
import { GetStaticProps, InferGetStaticPropsType } from "next";

import Container from "components/Container";
import Author from "components/Author";
import BlogPost from "components/BlogPost";

import { Post } from "lib/types";

export default function Home({
  posts,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  return (
    <Container title="Home - Ru Chern">
      <div className="mx-auto mb-16 flex max-w-4xl flex-col items-start justify-center">
        <Author
          description="Developer | Investor | Author"
          hideTagline={true}
        />
        <Suspense fallback={null}>
          <h2 className="mb-6 text-3xl font-bold md:text-4xl">All Posts</h2>
          {posts.map(({ description, slug, title }) => {
            return (
              <BlogPost
                key={title}
                description={description}
                slug={slug}
                title={title}
              />
            );
          })}
        </Suspense>
      </div>
    </Container>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const posts: Post[] = await fetch("https://dev.to/api/articles/me", {
    headers: {
      "api-key": process.env.DEV_TO_API_KEY,
    },
  }).then((res) => res.json());

  return {
    props: {
      posts,
    },
  };
};