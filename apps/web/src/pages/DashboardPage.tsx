import { useEffect } from 'react';

export default function DashboardPage() {
  useEffect(() => {
    document.title = 'Головна — AssetPool';
  }, []);
  return <h1>Головна панель</h1>;
}
