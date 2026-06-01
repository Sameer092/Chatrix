import { useInfiniteQuery } from '@tanstack/react-query';
import { postService } from '../../../services/post.service';

export function useFeed() {
  const query = useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: ({ pageParam = 0 }) => postService.getFeed(pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === 10 ? allPages.length : undefined,
  });

  return {
    posts: query.data?.pages.flat() ?? [],
    ...query,
  };
}
