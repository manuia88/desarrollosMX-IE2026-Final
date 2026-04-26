'use client';

import { useTranslations } from 'next-intl';
import { type CSSProperties, useState } from 'react';
import type { ContactNoteLevel } from '@/features/crm/schemas/contact-notes';
import { trpc } from '@/shared/lib/trpc/client';
import { NoteCard } from './note-card';
import { NoteEditor } from './note-editor';

export interface NotesPanelProps {
  leadId: string;
  currentUserId: string | null;
}

interface NoteRow {
  id: string;
  lead_id: string;
  level: ContactNoteLevel;
  author_user_id: string;
  content_md: string;
  created_at: string;
  updated_at: string;
}

export function NotesPanel({ leadId, currentUserId }: NotesPanelProps) {
  const t = useTranslations('AsesorContactos.notes');
  const utils = trpc.useUtils();
  const [editingId, setEditingId] = useState<string | null>(null);

  const listQuery = trpc.crm.notes.list.useQuery(
    { lead_id: leadId, limit: 50 },
    { staleTime: 30_000 },
  );
  const createMutation = trpc.crm.notes.create.useMutation();
  const updateMutation = trpc.crm.notes.update.useMutation();
  const deleteMutation = trpc.crm.notes.delete.useMutation();

  const invalidate = () => {
    utils.crm.notes.list.invalidate({ lead_id: leadId, limit: 50 });
  };

  const wrapperStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  };

  const listStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    maxHeight: 360,
    overflowY: 'auto',
    paddingRight: 4,
  };

  const messageStyle: CSSProperties = {
    fontSize: 12,
    color: 'var(--canon-cream-3)',
    fontFamily: 'var(--font-body)',
    padding: '12px 8px',
    textAlign: 'center',
    border: '1px dashed var(--canon-border-2)',
    borderRadius: 'var(--canon-radius-card)',
  };

  const errorStyle: CSSProperties = {
    ...messageStyle,
    color: '#fb7185',
    borderColor: 'rgba(244,63,94,0.4)',
  };

  // biome-ignore lint/suspicious/noExplicitAny: trpc query returns inferred shape; runtime fields validated.
  const rawNotes = (listQuery.data ?? []) as any[];
  const notes: NoteRow[] = rawNotes.map((n) => ({
    id: String(n.id),
    lead_id: String(n.lead_id),
    level: n.level as ContactNoteLevel,
    author_user_id: String(n.author_user_id),
    content_md: String(n.content_md),
    created_at: String(n.created_at),
    updated_at: String(n.updated_at),
  }));

  const editingNote = editingId ? (notes.find((n) => n.id === editingId) ?? null) : null;

  const handleCreate = async (input: { contentMd: string; level: ContactNoteLevel }) => {
    await createMutation.mutateAsync({
      lead_id: leadId,
      level: input.level,
      content_md: input.contentMd,
    });
    invalidate();
  };

  const handleEditSave = async (input: { contentMd: string; level: ContactNoteLevel }) => {
    if (!editingId) return;
    await updateMutation.mutateAsync({ id: editingId, content_md: input.contentMd });
    setEditingId(null);
    invalidate();
  };

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync({ id });
    invalidate();
  };

  return (
    <div style={wrapperStyle}>
      {editingNote ? (
        <NoteEditor
          isEditing
          initialContent={editingNote.content_md}
          initialLevel={editingNote.level}
          isSubmitting={updateMutation.isPending}
          onSave={handleEditSave}
          onCancel={() => setEditingId(null)}
        />
      ) : (
        <NoteEditor isSubmitting={createMutation.isPending} onSave={handleCreate} />
      )}

      {createMutation.error ? (
        <div role="alert" style={errorStyle}>
          {t('errors.createFailed', { detail: createMutation.error.message })}
        </div>
      ) : null}
      {updateMutation.error ? (
        <div role="alert" style={errorStyle}>
          {t('errors.updateFailed', { detail: updateMutation.error.message })}
        </div>
      ) : null}
      {deleteMutation.error ? (
        <div role="alert" style={errorStyle}>
          {t('errors.deleteFailed', { detail: deleteMutation.error.message })}
        </div>
      ) : null}

      {listQuery.isLoading ? (
        <p style={messageStyle}>{t('list.loading')}</p>
      ) : listQuery.error ? (
        <p style={errorStyle}>{t('list.errorLoading', { detail: listQuery.error.message })}</p>
      ) : notes.length === 0 ? (
        <p style={messageStyle}>{t('list.empty')}</p>
      ) : (
        <ul style={{ ...listStyle, listStyle: 'none', margin: 0, padding: 0 }}>
          {notes.map((note) => {
            const isOwner = currentUserId === note.author_user_id;
            return (
              <li key={note.id}>
                <NoteCard
                  id={note.id}
                  level={note.level}
                  authorUserId={note.author_user_id}
                  contentMd={note.content_md}
                  createdAt={note.created_at}
                  updatedAt={note.updated_at}
                  isOwner={isOwner}
                  onEdit={isOwner ? (id) => setEditingId(id) : undefined}
                  onDelete={isOwner ? handleDelete : undefined}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
