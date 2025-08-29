// frontend/src/components/FloatingSelect.jsx
import FloatingSelect from '@/components/FloatingSelect';

// estado (exemplo)
const [tipo, setTipo] = useState('');
const tipos = [
  { value: 'quadro', label: 'Quadro' },
  { value: 'espelho', label: 'Espelho' },
];

<FloatingSelect
  id="tipo-orcamento"
  name="tipo_orcamento"
  label="Tipo de Orçamento"
  value={tipo}
  onChange={(e) => setTipo(e.target.value)}
  options={tipos}
/>
