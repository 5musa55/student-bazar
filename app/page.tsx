"use client";

import { createClient } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Page() {
  const [items, setItems] = useState([]);
  const [formData, setFormData] = useState({ title: '', description: '', price: '' });
  const [images, setImages] = useState<FileList | null>(null);

  // Fetch items from Supabase
  useEffect(() => {
    const fetchItems = async () => {
      const { data, error } = await supabase.from('items').select('*');
      if (!error) setItems(data || []);
    };
    fetchItems();
  }, []);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { title, description, price } = formData;

    if (!title || !description || !price) return alert('Vyplňte všechna pole!');

    let imageUrls: string[] = [];
    if (images) {
      for (let i = 0; i < images.length; i++) {
        const file = images[i];
        const { data, error } = await supabase.storage
          .from('uploads') // Předpokládáme bucket 'uploads'
          .upload(`items/${Date.now()}-${file.name}`, file);

        if (error) {
          console.error(error);
          alert('Chyba při nahrávání obrázku.');
          return;
        }
        if (data) {
          const { publicUrl } = supabase.storage.from('uploads').getPublicUrl(data.path);
          imageUrls.push(publicUrl);
        }
      }
    }

    const { data, error } = await supabase.from('items').insert([
      { title, description, price, images: imageUrls }
    ]);
    if (error) {
      console.error(error);
      alert('Chyba při přidávání inzerátu.');
    } else {
      setItems((prev) => [...prev, ...data]);
      setFormData({ title: '', description: '', price: '' });
      setImages(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Studentský bazar</h1>
      <form onSubmit={handleSubmit} className="mb-6 space-y-4">
        <input
          type="text"
          placeholder="Název"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full p-2 border border-gray-300 rounded"
        />
        <textarea
          placeholder="Popis"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full p-2 border border-gray-300 rounded"
        />
        <input
          type="number"
          placeholder="Cena"
          value={formData.price}
          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
          className="w-full p-2 border border-gray-300 rounded"
        />
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => setImages(e.target.files)}
          className="w-full p-2 border border-gray-300 rounded"
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Přidat
        </button>
      </form>
      <h2 className="text-2xl font-semibold mb-4">Aktuální inzeráty</h2>
      <ul className="space-y-4">
        {items.map((item: any) => (
          <li key={item.id} className="p-4 border border-gray-300 rounded">
            <h3 className="text-xl font-bold">{item.title}</h3>
            <p>{item.description}</p>
            <p className="text-green-600 font-semibold">{item.price} Kč</p>
            <div className="flex space-x-2 mt-2">
              {item.images?.map((url: string, index: number) => (
                <img key={index} src={url} alt="Inzerát obrázek" className="w-20 h-20 object-cover" />
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}