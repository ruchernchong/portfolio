import { HOST_URL } from "@/config";

export const postToHashnode = async (publishedPost) => {
  const { title, content } = publishedPost;
  const slug = publishedPost.slug.current;
  const publicationId = process.env.HASHNODE_PUBLICATION_ID;

  const query = `
    mutation createPublicationStory($publicationId: String! , $input: CreateStoryInput!) {
      createPublicationStory(publicationId: $publicationId, input: $input) {
        code
        success
        message
        post {
          sourcedFromGithub
          isRepublished
          followersCount
          cuid
          slug
          title
          type
          partOfPublication
          dateUpdated
          totalReactions
          numCollapsed
          isDelisted
          isFeatured
          isActive
          replyCount
          responseCount
          popularity
          dateAdded
          contentMarkdown
          content
          brief
          coverImage
          isAnonymous
        }
      }
    }
  `;
  const variables = {
    publicationId,
    input: {
      title,
      contentMarkdown: content,
      isPartOfPublication: {
        publicationId,
      },
      isRepublished: {
        originalArticleURL: `${HOST_URL}/blog/${slug}`,
      },
      tags: [],
    },
  };

  try {
    const { data } = await fetch("https://api.hashnode.com", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: process.env.HASHNODE_ACCESS_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
    }).then((res) => res.json());
    console.log(`data`, data);

    return data.createPublicationStory;
  } catch (e) {
    throw e;
  }
};
