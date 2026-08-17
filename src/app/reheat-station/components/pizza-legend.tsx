"use client";

// Separate component for the shared legend
export function PizzaLegend({ slicesByType }: { slicesByType: Record<string, number>[] }) {
  // Combine all slice types from all ovens
  const allTypes = new Set<string>();
  slicesByType.forEach((oven) => {
    Object.keys(oven).forEach((type) => allTypes.add(type));
  });

  // Define colors for the three pizza types
  const colors: Record<string, string> = {
    margherita: "#8c3cfb",
    marinara: "#ef4444",
    piccante: "#16d7f9",
  };

  return (
    <div className="flex justify-center gap-4 mt-4 p-2 rounded border border-gray-300 dark:border-gray-700 bg-transparent">
      {Array.from(allTypes).map((type) => (
        <div key={type} className="flex items-center gap-1">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: colors[type] || "#8e8e8e" }}
          />
          <span>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
        </div>
      ))}
    </div>
  );
}
