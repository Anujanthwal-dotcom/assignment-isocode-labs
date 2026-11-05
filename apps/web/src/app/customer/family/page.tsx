'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { apiFetch } from '@/lib/api/client';
import { Users, Plus, Edit2, Trash2, Calendar, UserCheck, AlertCircle } from 'lucide-react';
import { FamilyMemberDTO, FamilyMemberRelationship } from '@pharmacy/shared-types';

const RELATIONSHIPS: { value: FamilyMemberRelationship; label: string }[] = [
  { value: 'SELF', label: 'Self (Account Owner)' },
  { value: 'MOTHER', label: 'Mother' },
  { value: 'FATHER', label: 'Father' },
  { value: 'SPOUSE', label: 'Spouse / Partner' },
  { value: 'CHILD', label: 'Child / Dependent' },
  { value: 'SIBLING', label: 'Sibling' },
  { value: 'OTHER', label: 'Other Family Member' },
];

export default function CustomerFamilyPage() {
  const [members, setMembers] = React.useState<FamilyMemberDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Dialog State
  const [isOpen, setIsOpen] = React.useState(false);
  const [editingMember, setEditingMember] = React.useState<FamilyMemberDTO | null>(null);
  const [fullName, setFullName] = React.useState('');
  const [relationship, setRelationship] = React.useState<FamilyMemberRelationship>('MOTHER');
  const [dateOfBirth, setDateOfBirth] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [dialogError, setDialogError] = React.useState<string | null>(null);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const res = await apiFetch<FamilyMemberDTO[]>('/customer/family-members');
      setMembers(res || []);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to load family profiles.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchMembers();
  }, []);

  const openAddDialog = () => {
    setEditingMember(null);
    setFullName('');
    setRelationship('MOTHER');
    setDateOfBirth('');
    setDialogError(null);
    setIsOpen(true);
  };

  const openEditDialog = (member: FamilyMemberDTO) => {
    setEditingMember(member);
    setFullName(member.fullName);
    setRelationship(member.relationship);
    setDateOfBirth(member.dateOfBirth ? member.dateOfBirth.slice(0, 10) : '');
    setDialogError(null);
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setDialogError('Full name is required.');
      return;
    }

    setSaving(true);
    setDialogError(null);

    try {
      if (editingMember) {
        await apiFetch(`/customer/family-members/${editingMember.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            fullName: fullName.trim(),
            relationship,
            dateOfBirth: dateOfBirth ? dateOfBirth : undefined,
          }),
        });
      } else {
        await apiFetch('/customer/family-members', {
          method: 'POST',
          body: JSON.stringify({
            fullName: fullName.trim(),
            relationship,
            dateOfBirth: dateOfBirth ? dateOfBirth : undefined,
          }),
        });
      }
      setIsOpen(false);
      await fetchMembers();
    } catch (err: unknown) {
      setDialogError((err as Error).message || 'Failed to save family member profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name}'s family profile?`)) {
      return;
    }
    try {
      await apiFetch(`/customer/family-members/${id}`, {
        method: 'DELETE',
      });
      await fetchMembers();
    } catch (err: unknown) {
      alert((err as Error).message || 'Cannot delete family member profile in use by orders or prescriptions.');
    }
  };

  return (
    <div className="max-w-[850px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#EAE8F0]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#351F65]">
            Family Profiles
          </h1>
          <p className="text-sm text-[#78879A] mt-1">
            Maintain profiles for relatives and dependents to easily associate prescriptions and orders.
          </p>
        </div>
        <Button
          onClick={openAddDialog}
          className="flex items-center gap-1.5 text-xs bg-[#6240E8] text-white hover:bg-[#5233D0]"
        >
          <Plus className="h-4 w-4" />
          <span>Add Family Member</span>
        </Button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-500">
          Loading family profiles...
        </div>
      ) : error ? (
        <Card className="p-8 border-red-200 bg-red-50 text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </Card>
      ) : members.length === 0 ? (
        <Card className="p-12 border-[#EAE8F0] bg-white text-center">
          <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No Family Profiles Yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Add profiles for your parents, children, or spouse to order medicines and upload prescriptions on their behalf.
          </p>
          <Button
            size="sm"
            onClick={openAddDialog}
            className="mt-4 text-xs bg-[#6240E8] text-white"
          >
            Add First Profile
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {members.map((member) => (
            <Card
              key={member.id}
              className="border-[#EAE8F0] bg-white hover:border-[#6240E8]/40 transition-all p-5 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-10 w-10 rounded-full bg-[#F7F5FD] flex items-center justify-center text-[#6240E8]">
                      {member.relationship === 'SELF' ? (
                        <UserCheck className="h-5 w-5" />
                      ) : (
                        <Users className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-[#351F65]">{member.fullName}</h3>
                      <Badge variant="purple" className="text-[11px] font-semibold mt-0.5">
                        {member.relationship}
                      </Badge>
                    </div>
                  </div>
                </div>

                {member.dateOfBirth && (
                  <div className="text-xs text-slate-500 flex items-center gap-1.5 pt-2 border-t border-slate-100">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>Born: {new Date(member.dateOfBirth).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditDialog(member)}
                  className="text-xs h-8 px-2.5 text-slate-600 border-slate-200"
                >
                  <Edit2 className="h-3.5 w-3.5 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(member.id, member.fullName)}
                  className="text-xs h-8 px-2.5 text-red-600 border-red-200 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Remove
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Profile Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#351F65]">
              {editingMember ? 'Edit Family Member Profile' : 'Add Family Member Profile'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            {dialogError && (
              <div className="p-3 text-xs rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{dialogError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Full Name *</label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Maya Ghosh"
                className="h-10 text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Relationship *</label>
              <select
                value={relationship}
                onChange={(e) => setRelationship(e.target.value as FamilyMemberRelationship)}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#6240E8]"
              >
                {RELATIONSHIPS.map((rel) => (
                  <option key={rel.value} value={rel.value}>
                    {rel.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Date of Birth (Optional)
              </label>
              <Input
                type="date"
                value={dateOfBirth}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="h-10 text-sm"
              />
              <span className="text-[11px] text-slate-400 block">
                Helps pharmacists cross-verify pediatric or geriatric dosage compliance.
              </span>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saving}
                className="text-xs bg-[#6240E8] text-white hover:bg-[#5233D0]"
              >
                {saving ? 'Saving...' : editingMember ? 'Save Changes' : 'Create Profile'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
