"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Page() {
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [items, setItems] = useState<
      {
        id: number; // Add id property
        title: string;
        description: string;
        price: string;
        user_email?: string;
        images: string[];
      }[]
    >([]);

  const [myItems, setMyItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState(""); // Přidání stavu pro vyhledávání
  const [editingItemId, setEditingItemId] = useState<number | null>(null); // ID upravovaného inzerátu
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
  });

  const [images, setImages] = useState<FileList | null>(null);
  const [view, setView] = useState("home"); // 'home', 'add', 'myItems'
  // Fetch all items
  const filteredItems = items.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
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

    if (!title || !description || !price) return alert("Vyplňte všechna pole!");

    let imageUrls: string[] = [];
    if (images) {
      for (let i = 0; i < images.length; i++) {
        const file = images[i];
        const safeFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "");

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("uploads")
          .upload(`items/${Date.now()}-${safeFileName}`, file);

        if (uploadError) {
          console.error(uploadError);
          alert("Chyba při nahrávání obrázku.");
          return;
        }

        if (uploadData && uploadData.path) {
          const { data: publicUrlData } = supabase.storage
            .from("uploads")
            .getPublicUrl(uploadData.path);
          if (publicUrlData) {
            imageUrls.push(publicUrlData.publicUrl);
          }
        }
      }
    }

    // Přidání inzerátu s user_id
    const { data, error } = await supabase
  .from('items')
  .insert([{ 
    title, 
    description, 
    price, 
    images: imageUrls, 
    user_id: user?.id,
    user_email: user?.email // Přidáno odeslání e-mailu
  }])
  .select();

    if (error) {
      console.error(error);
      alert("Chyba při přidávání inzerátu.");
    } else {
      if (data && Array.isArray(data)) {
        setItems((prev) => [...prev, ...data]); // Přidání nových dat do seznamu
      } else {
        console.warn("Žádná data nebyla vrácena z Supabase.");
      }
      setFormData({ title: "", description: "", price: "" });
      setImages(null);
      setView("home");
    }
  };

  // Handle buy item
  const handleBuy = (sellerEmail: string | null) => {
    alert(`Kontaktujte prodejce na e-mailu: ${sellerEmail}`);
  };


  const handleEdit = (item: any) => {
    setFormData({
      title: item.title,
      description: item.description,
      price: item.price,
    });
    setEditingItemId(item.id); // Nastavíme ID upravovaného inzerátu
    setView("edit"); // Přepneme pohled na formulář pro úpravu
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.description || !formData.price) {
      return alert("Vyplňte všechna pole!");
    }

    // Odeslání aktualizovaných dat na Supabase
    const { error } = await supabase
      .from("items")
      .update({
        title: formData.title,
        description: formData.description,
        price: formData.price,
      })
      .eq("id", editingItemId); // Aktualizujeme inzerát podle jeho ID

    if (error) {
      console.error(error);
      alert("Chyba při aktualizaci inzerátu.");
    } else {
      alert("Inzerát byl úspěšně aktualizován.");
      setView("myItems"); // Přepneme zpět na seznam inzerátů
      setFormData({ title: "", description: "", price: "" }); // Reset formuláře
      setEditingItemId(null); // Reset ID upravovaného inzerátu
    }
  };

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
          <button onClick={() => setView("home")} className="text-blue-500">
            Domů
          </button>
          {user && (
            <button onClick={() => setView("add")} className="text-blue-500">
              Přidat inzerát
            </button>
          )}
          {!user && (
            <a href="/login" className="text-blue-500">
              Přihlásit se
            </a>
          )}
          {user && (
            <button
              onClick={() => setView("myItems")}
              className="text-blue-500"
            >
              Moje inzeráty
            </button>
          )}
        </div>
        {user && (
          <button onClick={handleLogout} className="text-red-500">
            Odhlásit se
          </button>
        )}
      </nav>
      {/* Content */}
      {view === "home" && (
        <div>
          <h1 className="text-3xl font-bold mb-6">Všechny inzeráty</h1>
          <div className="mb-6">
            <input
              type="text"
              placeholder="Hledat inzeráty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>
          <ul className="space-y-4">
            {filteredItems.map((item: any) => (
              <li key={item.id} className="p-4 border border-gray-300 rounded">
                <h3 className="text-xl font-bold">{item.title}</h3>
                <p className="text-green-600 font-semibold">{item.price} Kč</p>
                <p className="mt-2 text-gray-700">{item.description}</p>
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
                {user && user.email !== item.user_email && (
                  <div>
                    <button
                      onClick={() => handleBuy(item.user_email)}
                      className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mt-4"
                    >
                      Kontaktovat prodejce
                    </button>
                  </div>
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
            {view === "edit" && (
              <form onSubmit={handleUpdate} className="space-y-4">
                <h1 className="text-3xl font-bold mb-6">Upravit inzerát</h1>
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
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Aktualizovat
                </button>
              </form>
            )}

      {view === "myItems" && (
        <div>
          <h1 className="text-3xl font-bold mb-6">Moje inzeráty</h1>
          <div className="mb-6">
            <input
              type="text"
              placeholder="Hledat inzeráty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>
          <ul className="space-y-4">
            {myItems.map((item) => (
              <div key={item.id} className="border p-4 rounded mb-4">
                <h3 className="text-xl font-bold">{item.title}</h3>
                <p>{item.description}</p>
                <p className="text-gray-600">{item.price} Kč</p>
                <button
                  onClick={() => handleEdit(item)}
                  className="text-blue-500 mt-2"
                >
                  Upravit
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-red-500 mt-2 ml-4"
                >
                  Smazat
                </button>
              </div>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
