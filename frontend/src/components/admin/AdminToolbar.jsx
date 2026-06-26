//frontend/src/components/admin/AdminToolbar.jsx

import { Link } from "react-router-dom";
import { ROUTES } from "../../config/routes";

export default function AdminToolbar() {
  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      <h1 className="text-2xl font-semibold text-emerald-800">
        Administração
      </h1>

      <Link
        to={ROUTES.ORCAMENTO}
        className="text-sm font-medium text-emerald-700 hover:text-emerald-900 hover:underline"
      >
        Ir para o Orçamento
      </Link>
    </div>
  );
}