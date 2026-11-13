import { useEffect } from 'react';

export default function DeviceDetailsPage() {
  useEffect(() => {
    document.title = 'Деталі пристрою — AssetPool';
  }, []);
  return <h1>Деталі пристрою</h1>;
}
