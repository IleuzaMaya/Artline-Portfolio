// AppRoutes.jsx (React Router v6)
const RequireAuth = () => {
  const token = localStorage.getItem('token'); // ou verifique cookie
  return token ? <Outlet/> : <Navigate to="/login" replace />;
};

<Routes>
  <Route path="/login" element={<Login/>} />
  <Route element={<RequireAuth/>}>
    <Route path="/orcamento" element={<OrcamentoForm/>} />
  </Route>
</Routes>
