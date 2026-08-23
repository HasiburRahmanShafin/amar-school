import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as galleryApi from '../../api/galleryApi';
import { uploadImage } from '../../api/uploadApi';

const CATEGORIES = ['facilities', 'events', 'activities'];

function GalleryManager() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const [filter, setFilter] = useState('all');

  const [category, setCategory] = useState('facilities');
  const [caption, setCaption] = useState('');

  const loadImages = () => {
    setLoading(true);
    galleryApi
      .getMyGallery()
      .then((res) => setImages(res.data))
      .catch((err) => setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to load gallery' }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadImages();
  }, []);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setMessage(null);
    try {
      const imageUrl = await uploadImage(file);
      await galleryApi.addGalleryImage({ imageUrl, caption, category });
      setCaption('');
      loadImages();
      setMessage({ type: 'success', text: 'Image added to gallery' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || err.message });
    } finally {
      setUploading(false);
      e.target.value = ''; // reset the file input so the same file can be re-picked if needed
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this image from the gallery?')) return;
    try {
      await galleryApi.deleteGalleryImage(id);
      setImages((prev) => prev.filter((img) => img._id !== id));
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to delete image' });
    }
  };

  const visibleImages = filter === 'all' ? images : images.filter((img) => img.category === filter);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <Link to="/admin/website-builder" className="text-sm text-blue-600">&larr; Back to Website Builder</Link>
        <h1 className="text-2xl font-bold mt-1 mb-6">Photo Gallery</h1>

        {message && (
          <p
            className={`text-sm p-3 rounded mb-4 ${
              message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}
          >
            {message.text}
          </p>
        )}

        {/* Upload form */}
        <div className="bg-white rounded shadow p-6 mb-6">
          <h2 className="font-semibold mb-3">Add a Photo</h2>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="border rounded px-3 py-2 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium mb-1">Caption (optional)</label>
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="e.g. Annual Sports Day 2026"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Photo</label>
              <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} className="text-sm" />
            </div>
          </div>
          {uploading && <p className="text-xs text-gray-500 mt-2">Uploading...</p>}
        </div>

        {/* Category filter tabs */}
        <div className="flex gap-2 mb-4">
          {['all', ...CATEGORIES].map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`px-3 py-1 rounded text-sm capitalize ${
                filter === c ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Gallery grid */}
        {loading ? (
          <p>Loading gallery...</p>
        ) : visibleImages.length === 0 ? (
          <p className="text-gray-500">No photos in this category yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {visibleImages.map((img) => (
              <div key={img._id} className="bg-white rounded shadow overflow-hidden">
                <img src={img.imageUrl} alt={img.caption || img.category} className="w-full h-32 object-cover" />
                <div className="p-2">
                  <p className="text-xs text-gray-500 capitalize">{img.category}</p>
                  {img.caption && <p className="text-sm truncate">{img.caption}</p>}
                  <button
                    onClick={() => handleDelete(img._id)}
                    className="text-xs text-red-600 mt-1"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default GalleryManager;
