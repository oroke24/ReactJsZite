/* eslint-disable */
import React, { useState, useEffect } from "react";
import { addProduct, getProducts, updateProduct, deleteProduct } from "../lib/products";
import { uploadImage, replaceImage, deleteImageByUrl } from "../lib/uploadImage";

export default function ProductManager({ businessId, collections = [] }) {
    const [product, setProduct] = useState({ name: "", price: "", description: "" });
    const [image, setImage] = useState(null);
    const [preview, setPreview] = useState(null);
    const [products, setProducts] = useState([]);
    const [showList, setShowList] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (image) {
            const objectUrl = URL.createObjectURL(image);
            setPreview(objectUrl);
            return () => URL.revokeObjectURL(objectUrl);
        } else {
            setPreview(null);
        }
    }, [image]);

    const loadProducts = async () => {
        if (!businessId) return;
        const data = await getProducts(businessId);
        setProducts(data);
    };

    // Ensure we load products when the list is visible or when businessId changes
    useEffect(() => {
        if (showList) {
            loadProducts();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showList, businessId]);

    const toggleProductsList = async () => {
        const next = !showList;
        setShowList(next);
        if (next) {
            await loadProducts();
        }
    };

    const handleAddOrUpdate = async () => {
        if (!businessId) return alert("No business selected!");
        setLoading(true);

        try {
            let imageUrl = null;

            if (editingId) {
                const current = products.find((p) => p.id === editingId);
                imageUrl = await replaceImage(image, businessId, current?.imageUrl);
                await updateProduct(businessId, editingId, {
                    ...product,
                    ...(imageUrl && { imageUrl }),
                });
                alert("✅ Product updated!");
                setEditingId(null);
            } else {
                imageUrl = image ? await uploadImage(image, businessId) : null;
                const id = await addProduct(businessId, { ...product, imageUrl });
                alert(`✅ Added new product (ID: ${id})`);
            }

            setProduct({ name: "", price: "", description: "" });
            setImage(null);
            loadProducts();
        } catch (error) {
            console.error(error);
            alert("❌ Error saving product.");
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (p) => {
        setProduct({ name: p.name, price: p.price, description: p.description });
        setPreview(p.imageUrl || null);
        setImage(null);
        setEditingId(p.id);
    };

    const handleDelete = async (id) => {
        const productToDelete = products.find((p) => p.id === id);
        if (window.confirm("Delete this product?")) {
            if (productToDelete?.imageUrl) await deleteImageByUrl(productToDelete.imageUrl);
            await deleteProduct(businessId, id);
            loadProducts();
        }
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setProduct({ name: "", price: "", description: "" });
        setImage(null);
        setPreview(null);
    };

    return (
        <div className="p-5 border rounded-lg bg-white shadow">
            <h2 className="text-xl font-semibold mb-4">
                {editingId ? "Edit Product" : "Add New Product"}
            </h2>

            <input
                type="text"
                placeholder="Name"
                value={product.name}
                onChange={(e) => setProduct({ ...product, name: e.target.value })}
                className="border p-2 w-full mb-2 rounded"
            />
            {/* Removed collections dropdown to use Collections Manager for membership */}
            <input
                type="number"
                placeholder="Price"
                value={product.price}
                onChange={(e) => setProduct({ ...product, price: e.target.value })}
                className="border p-2 w-full mb-2 rounded"
            />
            <textarea
                placeholder="Description"
                value={product.description}
                onChange={(e) => setProduct({ ...product, description: e.target.value })}
                className="border p-2 w-full mb-2 rounded"
            />

            {/* Image Upload + Preview */}
            <div className="mb-4">
                {preview && (
                    <div className="mb-2">
                        <img
                            src={preview}
                            alt="Preview"
                            className="w-32 h-32 object-cover rounded border mb-2"
                        />
                        <button
                            onClick={() => {
                                setImage(null);
                                setPreview(null);
                            }}
                            className="bg-red-500 text-white px-3 py-1 rounded"
                        >
                            Remove Image
                        </button>
                    </div>
                )}
                <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImage(e.target.files[0])}
                    className="block"
                />
            </div>

            <div className="flex gap-2 mb-5">
                <button
                    onClick={handleAddOrUpdate}
                    disabled={loading}
                    className={`bg-green-600 text-white px-4 py-2 rounded ${loading ? "opacity-50" : ""}`}
                >
                    {editingId ? "Update Product" : loading ? "Saving..." : "Add Product"}
                </button>

                {editingId && (
                    <button
                        onClick={handleCancelEdit}
                        className="bg-gray-400 text-white px-4 py-2 rounded"
                    >
                        Cancel
                    </button>
                )}

                <button onClick={toggleProductsList} className="bg-blue-600 text-white px-4 py-2 rounded">
                    {showList ? 'Hide Products' : 'Show Products'}
                </button>
            </div>

            <div style={{ overflow: 'hidden', transition: 'max-height 300ms ease', maxHeight: showList ? '1000px' : '0px' }}>
            <ul className="bg-gray-100 p-4 mt-4">
                {products.map((p) => (
                    <li
                        key={p.id}
                        className="border-b py-3 flex items-center justify-between hover:bg-gray-50 transition"
                    >
                        <div className="flex items-center">
                            {p.imageUrl && (
                                <img
                                    src={p.imageUrl}
                                    alt={p.name}
                                    className="w-16 h-16 object-cover rounded mr-4 border"
                                />
                            )}
                            <div>
                                <strong>{p.name}</strong> — ${p.price}
                                <p className="text-sm text-gray-600">{p.description}</p>
                                {/* Collection label removed per request */}
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => handleEdit(p)}
                                className="bg-yellow-500 text-white px-3 py-1 rounded"
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => handleDelete(p.id)}
                                className="bg-red-600 text-white px-3 py-1 rounded"
                            >
                                Delete
                            </button>
                        </div>
                    </li>
                ))}
            </ul>
            </div>
        </div>
    );
}
