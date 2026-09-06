import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { VariantsSidebar, type VariantFormState } from "../VariantsSidebar";
import type { Variant } from "../../types";

const variant: Variant = {
  id: "variant-1",
  sku: "SB-BLUE-L",
  name: "Blue / Large",
  options: { Color: "Blue", Size: "L" },
  price_override_ngn: 15_000,
  cost_price_ngn: 8_000,
  weight_grams: 250,
  is_active: true,
  quantity_available: 4,
};

const emptyForm: VariantFormState = {
  name: "",
  sku: "",
  options: "",
  price_override_ngn: "",
  cost_price_ngn: "",
  weight_grams: "",
  is_active: true,
};

function Harness({ onSave }: { onSave: (form: VariantFormState) => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<VariantFormState>(emptyForm);
  const [addForm, setAddForm] = useState<VariantFormState>(emptyForm);

  return (
    <VariantsSidebar
      variants={[variant]}
      showVariantForm={false}
      setShowVariantForm={() => undefined}
      variantForm={addForm}
      setVariantForm={setAddForm}
      onAddVariant={async () => undefined}
      editingVariantId={editingId}
      editVariantForm={editForm}
      setEditVariantForm={setEditForm}
      onStartEditVariant={(selected) => {
        setEditingId(selected.id);
        setEditForm({
          name: selected.name ?? "",
          sku: selected.sku,
          options: Object.entries(selected.options)
            .map(([key, value]) => `${key}: ${value}`)
            .join("\n"),
          price_override_ngn: String(selected.price_override_ngn ?? ""),
          cost_price_ngn: String(selected.cost_price_ngn ?? ""),
          weight_grams: String(selected.weight_grams ?? ""),
          is_active: selected.is_active,
        });
      }}
      onCancelEditVariant={() => setEditingId(null)}
      onUpdateVariant={async (event) => {
        event.preventDefault();
        onSave(editForm);
      }}
      onDeleteVariant={async () => undefined}
      savingVariant={false}
      deletingVariantId={null}
    />
  );
}

describe("VariantsSidebar", () => {
  it("lets Admin edit a variant's identity, prices, cost, weight and status", async () => {
    const onSave = vi.fn();
    render(<Harness onSave={onSave} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    expect(screen.getByLabelText(/variant name/i)).toHaveValue("Blue / Large");
    expect(screen.getByLabelText(/^sku$/i)).toHaveValue("SB-BLUE-L");
    expect(screen.getByLabelText(/selling price/i)).toHaveValue(15_000);
    expect(screen.getByLabelText(/unit cost/i)).toHaveValue(8_000);
    expect(screen.getByLabelText(/weight/i)).toHaveValue(250);
    expect(screen.getByLabelText(/active/i)).toBeChecked();

    fireEvent.change(screen.getByLabelText(/unit cost/i), {
      target: { value: "9250" },
    });
    fireEvent.change(screen.getByLabelText(/selling price/i), {
      target: { value: "17500" },
    });
    fireEvent.click(screen.getByLabelText(/active/i));
    fireEvent.click(screen.getByRole("button", { name: /save variant/i }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          cost_price_ngn: "9250",
          price_override_ngn: "17500",
          is_active: false,
        })
      )
    );
  });
});
