"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Page() {
  const [user, setUser] = useState(null);
  const [items, setItems] = useState<{ title: string; description: string; price: string; user_email?: string; images: string[] }[]>([]);
  const [myItems, setMyItems] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
  });
  const [images, setImages] = useState<FileList | null>(null);
  const [view, setView] = useState("home"); // 'home', 'add', 'myItems'

  // Fetch all items
  useEffect(() => {
    const fetchItems = async () => {
      const { data, error } = await supabase.from("items").select("*");
      if (!error) setItems(data || []);
    };
    fetchItems();
  }, []);

  // Fetch user session
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    fetchUser();
  }, []);

  // Fetch user's items
  useEffect(() => {
    if (user) {
      const fetchMyItems = async () => {
        const { data, error } = await supabase
          .from("items")
          .select("*")
          .eq("user_id", user.id);
        if (!error) setMyItems(data || []);
      };
      fetchMyItems();
    }
  }, [user]);

  // Handle login
  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
    });
    if (error) alert("Chyba při přihlášení.");
  };

  // Handle logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setMyItems([]);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { title, description, price } = formData;

    if (!title || !description || !price) return alert('Vyplňte všechna pole!');

    let imageUrls: string[] = [];
    if (images) {
      for (let i = 0; i < images.length; i++) {
        const file = images[i];
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('uploads')
          .upload(`items/${Date.now()}-${file.name}`, file);

        if (uploadError) {
          console.error(uploadError);
          alert('Chyba při nahrávání obrázku.');
          return;
        }

        if (uploadData && uploadData.path) {
          const { data: publicUrlData } = supabase.storage.from('uploads').getPublicUrl(uploadData.path);
          if (publicUrlData) {
            imageUrls.push(publicUrlData.publicUrl);
          }
        }
      }
    }

    // Přidání inzerátu s user_id
    const { data: { user } } = await supabase.auth.getUser();

    // Uložíme inzerát do databáze (s doplněným user.id a user.email)
    const { data, error } = await supabase.from('items').insert([
      { 
        title, 
        description, 
        price, 
        images: imageUrls, 
        user_id: user?.id, 
        user_email: user?.email 
      }
    ]).select(); // NEZAPOMENOUT NA SELECT!

    if (error) {
      console.error(error);
      alert('Chyba při přidávání inzerátu.');
    } else {
      // Správné použití TVÝCH stavových proměnných
      setItems((prev) => [...prev, ...data]);
      setFormData({ title: '', description: '', price: '' });
      setImages(null);
      setView('home');
    }
  };

  // Handle buy item
  const handleBuy = (sellerEmail: string | null) => {
    alert(`Kontaktujte prodejce na e-mailu: ${sellerEmail}`);
  };

  // Handle delete item
  const handleDelete = async (id: number) => {
    const { error } = await supabase.from("items").delete().eq("id", id);
    if (error) {
      alert("Chyba při mazání inzerátu.");
    } else {
      setMyItems((prev) => prev.filter((item) => item.id !== id));
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Menu */}
      <nav className="flex justify-between items-center mb-6">
        <div className="space-x-4">
          <button onClick={() => setView('home')} className="text-blue-500">Domů</button>
          {user && <button onClick={() => setView('add')} className="text-blue-500">Přidat inzerát</button>}
          {!user && <a href="/login" className="text-blue-500">Přihlásit se</a>}
          {user && <button onClick={() => setView('myItems')} className="text-blue-500">Moje inzeráty</button>}
        </div>
        {user && <button onClick={handleLogout} className="text-red-500">Odhlásit se</button>}
      </nav>

      {/* Content */}
      {view === "home" && (
        <div>
          <h1 className="text-3xl font-bold mb-6">Všechny inzeráty</h1>
          <ul className="space-y-4">
            {items.map((item: any) => (
              <li key={item.id} className="p-4 border border-gray-300 rounded">
                <h3 className="text-xl font-bold">{item.title}</h3>
                <p className="text-green-600 font-semibold">{item.price} Kč</p>
                <p className="mt-2 text-gray-700">{item.description}</p>
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-40 object-cover mt-4"
                  />
                )}
                {user && user.email !== item.user_email && (
                  <button
                    onClick={() => handleBuy(item.user_email)}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mt-4"
                  >
                    Koupit
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {view === "add" && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <h1 className="text-3xl font-bold mb-6">Přidat nový inzerát</h1>
          <input
            type="text"
            placeholder="Název"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            className="w-full p-2 border border-gray-300 rounded"
          />
          <textarea
            placeholder="Popis"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            className="w-full p-2 border border-gray-300 rounded"
          />
          <input
            type="number"
            placeholder="Cena"
            value={formData.price}
            onChange={(e) =>
              setFormData({ ...formData, price: e.target.value })
            }
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
      )}

      {view === "myItems" && (
        <div>
          <h1 className="text-3xl font-bold mb-6">Moje inzeráty</h1>
          <ul className="space-y-4">
            {myItems.map((item: any) => (
              <li key={item.id} className="p-4 border border-gray-300 rounded">
                <h3 className="text-xl font-bold">{item.title}</h3>
                <p className="text-green-600 font-semibold">{item.price} Kč</p>
                <div
                  className="mt-2 text-gray-700"
                  dangerouslySetInnerHTML={{ __html: item.description }}
                />
                <div className="flex space-x-2 mt-2 overflow-x-auto">
                  {Array.isArray(item.images) &&
                    item.images.map((url: string, index: number) => (
                      <img
                        key={index}
                        src={url}
                        alt={`Obrázek inzerátu ${index + 1}`}
                        className="w-24 h-24 object-cover rounded"
                      />
                    ))}
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-red-500 mt-2"
                >
                  Smazat
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
