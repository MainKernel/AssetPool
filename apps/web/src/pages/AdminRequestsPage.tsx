import { useEffect } from 'react';

export default function AdminRequestsPage() {
  useEffect(() => {
    document.title = 'Заявки на видачу — AssetPool';
  }, []);
  return <h1>Вхідні заявки на видачу</h1>;
}
