"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { VolunteerRole } from "@/lib/volunteers";

import { RoleFormFields, type RoleForm } from "./RoleFormFields";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  editingRole: VolunteerRole | null;
  roleForm: RoleForm;
  setRoleForm: React.Dispatch<React.SetStateAction<RoleForm>>;
  onSubmit: (e: React.FormEvent) => Promise<void>;
};

export function EditRoleModal({
  isOpen,
  onClose,
  editingRole,
  roleForm,
  setRoleForm,
  onSubmit,
}: Props) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingRole ? `Edit: ${editingRole.title}` : "Edit Volunteer Role"}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <RoleFormFields
          roleForm={roleForm}
          setRoleForm={setRoleForm}
          responsibilitiesRows={5}
          showTitlePlaceholder={false}
        />

        {editingRole && (
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span>
              {editingRole.active_volunteers_count} active volunteer
              {editingRole.active_volunteers_count !== 1 ? "s" : ""}
            </span>
            <span>·</span>
            <span>Sort: {editingRole.sort_order}</span>
            <span>·</span>
            <span>Created {new Date(editingRole.created_at).toLocaleDateString("en-NG")}</span>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save Changes</Button>
        </div>
      </form>
    </Modal>
  );
}
