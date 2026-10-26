/**
 * Экспорты API хуков для блога
 * @module features/blog/api
 */

// Blog Posts (организатор)
export {
  useBlogPosts,
  useBlogPost,
  useCreateBlogPost,
  useUpdateBlogPost,
  useDeleteBlogPost,
  useSubmitBlogPost,
  usePublishBlogPost,
  useUnpublishBlogPost,
  blogPostsKeys,
} from "./use-blog-posts";

// Real per-status counts (stat cards + tab badges)
export { useBlogPostCounts, type BlogPostCounts } from "./use-blog-post-counts";

// Public Blog
export {
  usePublishedBlogPosts,
  useBlogPostBySlug,
  usePublicBlogPost,
  publicBlogKeys,
} from "./use-public-blog";

// Slug (suggest / check)
export {
  useSuggestBlogSlug,
  useCheckBlogSlug,
  BLOG_SUGGEST_SLUG_KEY,
  BLOG_CHECK_SLUG_KEY,
} from "./use-blog-slug";

// Comments
export {
  useBlogComments,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
  useToggleCommentLike,
  blogCommentsKeys,
} from "./use-blog-comments";

// Likes
export {
  useBlogLikeCheck,
  useLikeBlogPost,
  useUnlikeBlogPost,
  useToggleBlogLike,
  blogLikesKeys,
} from "./use-blog-likes";

// Saved Posts
export {
  useSavedBlogPosts,
  useSavedBlogPostCheck,
  useSaveBlogPost,
  useUnsaveBlogPost,
  useToggleSaveBlogPost,
  savedBlogPostsKeys,
} from "./use-saved-blog-posts";

// Tags
export { useOrganizationTags, tagsKeys } from "./use-tags";

// Categories (global blog taxonomy)
export { useBlogCategories, blogCategoriesKeys } from "./use-blog-categories";
