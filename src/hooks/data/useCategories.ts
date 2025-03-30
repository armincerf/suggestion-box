import { useQuery } from "@rocicorp/zero/solid";
import { type TZero, useZero } from "../../zero/ZeroContext";
import { QUERY_TTL_FOREVER } from "../../utils/constants";

export const categoriesQuery = (z: TZero) => 
  z.query.categories;

export function useCategories() {
  const z = useZero();

  return useQuery(
    () => categoriesQuery(z),
    { ttl: QUERY_TTL_FOREVER }
  );
} 