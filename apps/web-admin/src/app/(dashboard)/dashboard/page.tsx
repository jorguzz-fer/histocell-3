export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Pedidos hoje', valor: '12', cor: 'bg-blue-50 text-blue-700' },
          { label: 'Amostras pendentes', valor: '34', cor: 'bg-amber-50 text-amber-700' },
          { label: 'OS em andamento', valor: '8', cor: 'bg-purple-50 text-purple-700' },
          { label: 'Laudos prontos', valor: '5', cor: 'bg-green-50 text-green-700' },
        ].map((card) => (
          <div key={card.label} className={`p-4 rounded-xl ${card.cor}`}>
            <p className="text-sm opacity-70">{card.label}</p>
            <p className="text-3xl font-bold mt-1">{card.valor}</p>
          </div>
        ))}
      </div>

      <p className="text-gray-500">Bem-vindo ao sistema de gestão laboratorial Histocell.</p>
    </div>
  )
}
