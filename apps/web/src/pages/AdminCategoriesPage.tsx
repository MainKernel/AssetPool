import { useEffect } from 'react';

export default function AdminCategoriesPage() {
  useEffect(() => {
    document.title = 'Категорії — AssetPool';
  }, []);
  return <h1>Категорії обладнання</h1>;
}
