import { useEffect } from 'react';

export default function MyDevicesPage() {
  useEffect(() => {
    document.title = 'Мої пристрої — AssetPool';
  }, []);
  return <h1>Мої пристрої та заявки</h1>;
}
