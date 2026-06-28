//frontend/src/components/admin/AdminAccountsTable.jsx

import React from "react";

export default function AdminAccountsTable({
  accounts,
  activeTab,
  editingId,
  editForm,
  editError,
  savingEdit,
  currentEmail,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditChange,
  onOpenDetails,
  canEditProfile,
  canEditAccess,
  getAccId,
  getRowKey,
  isUuid,
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs text-slate-500">
            <th className="px-3 py-2 font-medium w-56">Nome</th>
            <th className="px-3 py-2 font-medium w-64">E-mail</th>
            <th className="px-3 py-2 font-medium w-28">Status</th>
            <th className="px-3 py-2 font-medium w-32">Perfil</th>
            <th className="px-3 py-2 font-medium w-32 text-right">Ações</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {accounts.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-sm text-slate-500 text-center">
                Nenhum registro encontrado.
              </td>
            </tr>
          ) : (
            accounts.map((acc, i) => {
              const accId = getAccId(acc);
              const rowKey = getRowKey(acc);
              const isEditing = editingId === rowKey;

              return (
                <React.Fragment key={rowKey || `idx:${activeTab}:${i}`}>
                  <tr className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 text-sm text-slate-800">
                      {isEditing ? (
                        <input
                          type="text"
                          className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
                          value={editForm.nome}
                          disabled={!editForm.__canProfile}
                          onChange={(e) => onEditChange("nome", e.target.value)}
                        />
                      ) : (
                        acc.nome || "—"
                      )}
                    </td>

                    <td className="px-4 py-3 text-sm text-slate-800">
                      {isEditing ? (
                        <input
                          type="email"
                          className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
                          value={editForm.email}
                          disabled={!editForm.__canEmail}
                          onChange={(e) => onEditChange("email", e.target.value)}
                          title={
                            editForm.__canEmail
                              ? "Você pode corrigir o e-mail (super-admin)."
                              : "E-mail não pode ser alterado."
                          }
                        />
                      ) : (
                        acc.email
                      )}
                    </td>

                    <td className="px-4 py-3 text-sm">
                      <span
                        className={
                          (acc.ativo
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-200 text-slate-700") +
                          " inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                        }
                      >
                        {acc.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-sm text-slate-800">
                      {isEditing ? (
                        <select
                          className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
                          value={editForm.role}
                          disabled={!editForm.__canAccess}
                          onChange={(e) => onEditChange("role", e.target.value)}
                        >
                          <option value="cliente">Cliente</option>
                          <option value="admin">Administrador</option>
                        </select>
                      ) : acc.role === "admin" ? (
                        "Administrador"
                      ) : (
                        "Cliente"
                      )}
                    </td>

                    <td className="px-4 py-3 text-sm">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={onCancelEdit}
                            className="inline-flex items-center rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            disabled={savingEdit}
                          >
                            Cancelar
                          </button>

                          <button
                            type="button"
                            onClick={onSaveEdit}
                            className="inline-flex items-center rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                            disabled={savingEdit}
                          >
                            {savingEdit ? "Salvando..." : "Salvar"}
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => onOpenDetails(acc)}
                            className="inline-flex items-center rounded-md border border-emerald-600 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                          >
                            Detalhes
                          </button>

                          {(canEditProfile(currentEmail, acc) ||
                            canEditAccess(currentEmail, acc)) && (
                            <button
                              type="button"
                              onClick={() => onStartEdit(acc)}
                              className="inline-flex items-center justify-center rounded-md border border-emerald-600 p-2 text-emerald-700 hover:bg-emerald-50"
                              title="Editar"
                              aria-label="Editar"
                            >
                              ✎
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>

                  {isEditing && (
                    <tr className="bg-slate-50">
                      <td colSpan={5} className="px-4 pb-4 pt-2">
                        {editError && (
                          <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                            {editError}
                          </div>
                        )}

                        <div className="grid gap-3 md:grid-cols-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">
                              Empresa (opcional)
                            </label>
                            <input
                              type="text"
                              className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
                              value={editForm.empresa}
                              disabled={!editForm.__canProfile}
                              onChange={(e) => onEditChange("empresa", e.target.value)}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">
                              Telefone (opcional)
                            </label>
                            <input
                              type="text"
                              className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
                              value={editForm.telefone}
                              disabled={!editForm.__canProfile}
                              onChange={(e) => onEditChange("telefone", e.target.value)}
                            />
                          </div>

                          <div className="flex items-end">
                            <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                checked={!!editForm.ativo}
                                disabled={!editForm.__canAccess}
                                onChange={(e) => onEditChange("ativo", e.target.checked)}
                              />
                              Ativo
                            </label>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}