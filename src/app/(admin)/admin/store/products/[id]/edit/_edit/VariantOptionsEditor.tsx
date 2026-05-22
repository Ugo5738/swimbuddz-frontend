"use client";

import Image from "next/image";

type Props = {
  variantOptions: Record<string, string[]>;
  colorSwatches: Record<string, string>;
  newDimensionName: string;
  setNewDimensionName: (value: string) => void;
  newValueInputs: Record<string, string>;
  setNewValueInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onAddDimension: () => void;
  onRemoveDimension: (dim: string) => void;
  onAddValue: (dim: string) => void;
  onRemoveValue: (dim: string, val: string) => void;
  onSwatchChange: (colorName: string, url: string) => void;
};

export function VariantOptionsEditor({
  variantOptions,
  colorSwatches,
  newDimensionName,
  setNewDimensionName,
  newValueInputs,
  setNewValueInputs,
  onAddDimension,
  onRemoveDimension,
  onAddValue,
  onRemoveValue,
  onSwatchChange,
}: Props) {
  return (
    <div className="pt-4 border-t border-slate-200">
      <h3 className="text-lg font-medium text-slate-900 mb-1">Variant Options</h3>
      <p className="text-sm text-slate-500 mb-4">
        Define dimensions (e.g. Color, Size) and their possible values. These are saved as
        product-level metadata.
      </p>

      {/* Existing dimensions */}
      <div className="space-y-4">
        {Object.entries(variantOptions).map(([dim, values]) => (
          <div key={dim} className="border border-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-slate-800">{dim}</h4>
              <button
                type="button"
                onClick={() => onRemoveDimension(dim)}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            </div>

            {/* Value tags */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {values.map((val) => (
                <span
                  key={val}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-sm"
                >
                  {dim.toLowerCase() === "color" && colorSwatches[val] && (
                    <span
                      className="w-3 h-3 rounded-full border border-slate-300 inline-block"
                      style={{
                        backgroundImage: `url(${colorSwatches[val]})`,
                        backgroundSize: "cover",
                      }}
                    />
                  )}
                  {val}
                  <button
                    type="button"
                    onClick={() => onRemoveValue(dim, val)}
                    className="text-slate-400 hover:text-red-500 ml-0.5"
                  >
                    ×
                  </button>
                </span>
              ))}
              {values.length === 0 && (
                <span className="text-xs text-slate-400 italic">No values yet</span>
              )}
            </div>

            {/* Add value input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newValueInputs[dim] || ""}
                onChange={(e) =>
                  setNewValueInputs((prev) => ({ ...prev, [dim]: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onAddValue(dim);
                  }
                }}
                placeholder={`Add ${dim.toLowerCase()} value...`}
                className="flex-1 px-2.5 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
              />
              <button
                type="button"
                onClick={() => onAddValue(dim)}
                className="px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 font-medium"
              >
                +
              </button>
            </div>

            {/* Color swatches sub-section */}
            {dim.toLowerCase() === "color" && values.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-100">
                <p className="text-xs font-medium text-slate-600 mb-2">
                  Color Swatches (optional image URLs)
                </p>
                <div className="space-y-2">
                  {values.map((colorName) => (
                    <div key={colorName} className="flex items-center gap-2">
                      <span className="text-xs text-slate-600 w-16 shrink-0 truncate">
                        {colorName}:
                      </span>
                      {colorSwatches[colorName] && (
                        <span className="relative w-6 h-6 overflow-hidden rounded border border-slate-200 shrink-0 inline-block">
                          <Image
                            src={colorSwatches[colorName]}
                            alt={colorName}
                            fill
                            sizes="24px"
                            className="object-cover"
                          />
                        </span>
                      )}
                      <input
                        type="text"
                        value={colorSwatches[colorName] || ""}
                        onChange={(e) => onSwatchChange(colorName, e.target.value)}
                        placeholder="https://..."
                        className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded-md focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add new dimension */}
      <div className="mt-4 flex gap-2">
        <input
          type="text"
          value={newDimensionName}
          onChange={(e) => setNewDimensionName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAddDimension();
            }
          }}
          placeholder="New dimension name (e.g. Color, Size)"
          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm"
        />
        <button
          type="button"
          onClick={onAddDimension}
          className="px-4 py-2 text-sm bg-cyan-50 text-cyan-700 rounded-lg hover:bg-cyan-100 font-medium whitespace-nowrap"
        >
          + Add Dimension
        </button>
      </div>
    </div>
  );
}
