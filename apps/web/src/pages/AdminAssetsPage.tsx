import { useEffect } from 'react';

export default function AdminAssetsPage() {
  useEffect(() => {
    document.title = 'Управління активами — AssetPool';
  }, []);
  return <h1>Управління ІТ-активами</h1>;
}
