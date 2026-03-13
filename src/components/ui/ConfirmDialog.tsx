interface Props {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ message, onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-2xl border border-neutral-200 p-6 max-w-sm mx-4" onClick={e => e.stopPropagation()}>
        <div className="text-sm font-semibold text-neutral-900 mb-2">Confirmer la suppression</div>
        <div className="text-xs text-neutral-500 mb-4">{message}</div>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition">
            Annuler
          </button>
          <button onClick={onConfirm} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition">
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}
