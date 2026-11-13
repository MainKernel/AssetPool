import { useEffect } from 'react';

export default function LoginPage() {
  useEffect(() => {
    document.title = 'Вхід — AssetPool';
  }, []);
  return <h1>Вхід до системи</h1>;
}
