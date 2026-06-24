import { getCollection, render } from 'astro:content';

export async function GET() {
  const posts = await getCollection('posts', ({ data }) => !data.draft);

  const index = await Promise.all(
    posts.map(async (post) => {
      const { remarkPluginFrontmatter } = await render(post);
      return {
        slug: post.id,
        title: post.data.title,
        tags: post.data.tags,
        lines: remarkPluginFrontmatter.searchLines ?? [],
      };
    })
  );

  return new Response(JSON.stringify(index), {
    headers: { 'Content-Type': 'application/json' },
  });
}
