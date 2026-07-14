//frontend/src/components/admin/AdminCreateUserForm.jsx

export default function AdminCreateUserForm({
  formName,
  setFormName,
  formEmpresa,
  setFormEmpresa,
  formRole,
  setFormRole,
  formEmail,
  setFormEmail,
  formTelefone,
  setFormTelefone,
  formSenha,
  setFormSenha,
  showCreatePassword,
  setShowCreatePassword,
  loadingSubmit,
  submitError,
  onSubmit,
  formatPhone,
}) {
  return (
    <div className="mb-6 rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,.08)] p-5 md:p-6">
      <h2 className="text-base font-semibold text-slate-800">
        Criar/Convidar cliente
      </h2>

      <p className="mt-1 text-xs text-slate-500">
        Se <span className="font-semibold">senha</span> ficar em branco, será
        gerado um <span className="font-semibold">link de convite</span>.
      </p>

      <form onSubmit={onSubmit} className="mt-4 grid gap-4 md:grid-cols-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Nome</label>
          <input
            type="text"
            className="h-10 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            placeholder="Nome do cliente"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">
            Empresa
          </label>
          <input
            type="text"
            className="h-10 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            placeholder="Empresa do cliente"
            value={formEmpresa}
            onChange={(e) => setFormEmpresa(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">
            Tipo de acesso
          </label>
          <select
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            value={formRole}
            onChange={(e) => setFormRole(e.target.value)}
          >
            <option value="cliente">Cliente</option>
            <option value="admin">Administrador</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">E-mail</label>
          <input
            type="email"
            className="h-10 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            placeholder="cliente@exemplo.com"
            value={formEmail}
            onChange={(e) => setFormEmail(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">
            Telefone
          </label>
          <input
            type="tel"
            className="h-10 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            placeholder="(11) 91234-5678"
            value={formTelefone}
            onChange={(e) => setFormTelefone(formatPhone(e.target.value))}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">
            Senha opcional
          </label>

          <div className="relative">
            <input
              type={showCreatePassword ? "text" : "password"}
              className="h-10 w-full rounded-md border border-slate-200 px-3 pr-16 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              placeholder="Deixe vazio para enviar convite"
              value={formSenha}
              onChange={(e) => setFormSenha(e.target.value)}
            />

            <button
              type="button"
              onClick={() => setShowCreatePassword((value) => !value)}
              className="absolute inset-y-0 right-2 text-xs font-medium text-emerald-700 hover:text-emerald-900"
            >
              {showCreatePassword ? "Ocultar" : "Mostrar"}
            </button>
          </div>
        </div>

        <div className="md:col-span-3 flex items-end">
          <button
            type="submit"
            disabled={loadingSubmit}
            className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loadingSubmit ? "Enviando..." : "Criar / Enviar convite"}
          </button>
        </div>
      </form>

      {submitError && (
        <p className="mt-2 text-sm text-red-600">{submitError}</p>
      )}
    </div>
  );
}

