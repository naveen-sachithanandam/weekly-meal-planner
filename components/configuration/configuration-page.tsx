"use client";

import useSWR from "swr";

import type { MealTypesResponse } from "../../lib/types";
import { AddMealTypeForm } from "./add-meal-type-form";
import { MealTypeList } from "./meal-type-list";

async function fetchMealTypes(url: string): Promise<MealTypesResponse> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to load meal types");
  }
  return response.json() as Promise<MealTypesResponse>;
}

export function ConfigurationPage() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/configuration/meal-types",
    fetchMealTypes,
  );

  return (
    <section>
      <h1 className="page-title">Settings</h1>
      <h2 className="mb-3 text-lg font-medium text-gray-900">Meal types</h2>

      <AddMealTypeForm onAdded={() => mutate()} />

      {isLoading && <p>Loading meal types…</p>}
      {error && <p role="alert">Could not load meal types.</p>}
      {data && (
        <MealTypeList mealTypes={data.mealTypes} onUpdated={() => mutate()} />
      )}
    </section>
  );
}
