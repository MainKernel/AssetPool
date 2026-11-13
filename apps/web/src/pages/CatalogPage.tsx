import { useEffect } from 'react';

export default function CatalogPage() {
  useEffect(() => {
    document.title = 'Каталог пристроїв — AssetPool';
  }, []);
  return <h1>Каталог пристроїв</h1>;
}
