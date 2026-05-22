"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

import { RoleFormFields, type RoleForm } from "./RoleFormFields";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  roleForm: RoleForm;
  setRoleForm: React.Dispatch<React.SetStateAction<RoleForm>>;
  onSubmit: (e: React.FormEvent) => Promise<void>;
};

export function CreateRoleModal({ isOpen, onClose, roleForm, setRoleForm, onSubmit }: Props) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Volunteer Role">
      <form onSubmit={onSubmit} className="space-y-4">
        <RoleFormFields roleForm={roleForm} setRoleForm={setRoleForm} responsibilitiesRows={4} />

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Create Role</Button>
        </div>
      </form>
    </Modal>
  );
}
