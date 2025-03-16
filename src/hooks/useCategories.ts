import type { Schema, Category } from "../schema";
import type { Zero } from "@rocicorp/zero";
import { useQuery } from "@rocicorp/zero/solid";
import { useZero } from "../context/ZeroContext";

/**
 * Base query for categories
 */
export const categoryQuery = (z: Zero<Schema>) =>
  z.query.category.orderBy("name", "asc");

/**
 * Hook to fetch all categories
 */
export function useCategories() {
  const z = useZero();

  const [categories] = useQuery(() => categoryQuery(z));

  return { categories };
}

/**
 * Hook to fetch a specific category by ID
 */
export function useCategoryById(props: {
  categoryId: string;
}) {
  const z = useZero();

  const [category] = useQuery(() =>
    z.query.category.where("id", props.categoryId),
  );
  
  return { 
    category: () => category()[0] || null 
  };
}

/**
 * Hook to fetch suggestions filtered by category
 */
export function useSuggestionsByCategory(props: {
  categoryId: string;
  limit?: number;
  orderBy?: "timestamp" | "id";
  orderDirection?: "asc" | "desc";
}) {
  const z = useZero();

  const orderBy = props.orderBy || "timestamp";
  const orderDirection = props.orderDirection || "desc";

  const [suggestions] = useQuery(() => {
    const query = z.query.suggestion
      .where("categoryID", props.categoryId)
      .orderBy(orderBy, orderDirection);
      
    return props.limit ? query.limit(props.limit) : query;
  });
  
  return { suggestions };
}

/**
 * Get all categories (non-reactive function for use with createResource)
 */
export const getAllCategories = async (z: Zero<Schema>): Promise<Category[]> => {
  return await z.query.category.orderBy("name", "asc").run();
}; 