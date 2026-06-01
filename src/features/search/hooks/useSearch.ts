import { useQuery } from '@tanstack/react-query';
import { profileService } from '../../../services/profile.service';
import { useDebounce } from '../../../hooks/useDebounce';

export function useSearch(query: string) {
  const debouncedQuery = useDebounce(query, 400);

  const result = useQuery({
    queryKey: ['searchUsers', debouncedQuery],
    queryFn: () => profileService.searchUsers(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  });

  return { ...result, debouncedQuery };
}
