import { useEffect } from 'react';

export default function AdminHistoryPage() {
  useEffect(() => {
    document.title = 'Історія руху — AssetPool';
  }, []);
  return <h1>Глобальний журнал руху активів</h1>;
}
