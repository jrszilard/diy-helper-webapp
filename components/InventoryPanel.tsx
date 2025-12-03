'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Wrench, 
  Zap, 
  Ruler, 
  Shield, 
  Lightbulb, 
  Droplets, 
  Paintbrush,
  Package,
  Plus,
  Trash2,
  Edit2,
  X,
  Check,
  Search
} from 'lucide-react';

interface InventoryItem {
  id: string;
  item_name: string;
  category: string;
  quantity: number;
  condition: string;
  notes: string | null;
  auto_added: boolean;
  created_at: string;
}

interface InventoryPanelProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES = [
  { value: 'power_tools', label: 'Power Tools', icon: Zap },
  { value: 'hand_tools', label: 'Hand Tools', icon: Wrench },
  { value: 'measuring', label: 'Measuring', icon: Ruler },
  { value: 'safety', label: 'Safety Gear', icon: Shield },
  { value: 'electrical', label: 'Electrical', icon: Lightbulb },
  { value: 'plumbing', label: 'Plumbing', icon: Droplets },
  { value: 'painting', label: 'Painting', icon: Paintbrush },
  { value: 'fasteners', label: 'Fasteners', icon: Package },
  { value: 'materials', label: 'Materials', icon: Package },
  { value: 'general', label: 'General', icon: Package },
];

const CONDITIONS = [
  { value: 'new', label: 'New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'needs_repair', label: 'Needs Repair' },
];

export default function InventoryPanel({ userId, isOpen, onClose }: InventoryPanelProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    item_name: '',
    category: 'general',
    quantity: 1,
    condition: 'good',
    notes: ''
  });

  useEffect(() => {
    if (isOpen && userId) {
      loadInventory();
    }
  }, [isOpen, userId]);

  const loadInventory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_inventory')
        .select('*')
        .eq('user_id', userId)
        .order('category')
        .order('item_name');

      if (error) throw error;
      setInventory(data || []);
    } catch (err) {
      console.error('Error loading inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!formData.item_name.trim()) return;

    try {
      const { error } = await supabase
        .from('user_inventory')
        .insert({
          user_id: userId,
          item_name: formData.item_name.trim(),
          category: formData.category,
          quantity: formData.quantity,
          condition: formData.condition,
          notes: formData.notes || null,
          auto_added: false
        });

      if (error) throw error;

      setFormData({
        item_name: '',
        category: 'general',
        quantity: 1,
        condition: 'good',
        notes: ''
      });
      setShowAddForm(false);
      loadInventory();
    } catch (err: any) {
      if (err.code === '23505') {
        alert('This item is already in your inventory!');
      } else {
        console.error('Error adding item:', err);
        alert('Failed to add item');
      }
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem || !formData.item_name.trim()) return;

    try {
      const { error } = await supabase
        .from('user_inventory')
        .update({
          item_name: formData.item_name.trim(),
          category: formData.category,
          quantity: formData.quantity,
          condition: formData.condition,
          notes: formData.notes || null
        })
        .eq('id', editingItem.id);

      if (error) throw error;

      setEditingItem(null);
      setFormData({
        item_name: '',
        category: 'general',
        quantity: 1,
        condition: 'good',
        notes: ''
      });
      loadInventory();
    } catch (err) {
      console.error('Error updating item:', err);
      alert('Failed to update item');
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Remove this item from your inventory?')) return;

    try {
      const { error } = await supabase
        .from('user_inventory')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadInventory();
    } catch (err) {
      console.error('Error deleting item:', err);
      alert('Failed to delete item');
    }
  };

  const startEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      item_name: item.item_name,
      category: item.category,
      quantity: item.quantity,
      condition: item.condition,
      notes: item.notes || ''
    });
    setShowAddForm(false);
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setFormData({
      item_name: '',
      category: 'general',
      quantity: 1,
      condition: 'good',
      notes: ''
    });
  };

  // Filter inventory based on search and category
  const filteredInventory = inventory.filter(item => {
    const matchesSearch = !searchQuery || 
      item.item_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || 
      item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group by category
  const groupedInventory = filteredInventory.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, InventoryItem[]>);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
      <div className="w-full max-w-md bg-white h-full overflow-hidden flex flex-col shadow-xl">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">My Tool Inventory</h2>
            <p className="text-blue-50 text-sm">{inventory.length} items</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Search and Filter */}
        <div className="p-4 border-b space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600" size={18} />
            <input
              type="text"
              placeholder="Search inventory..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1 rounded-full text-sm ${
                !selectedCategory
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {CATEGORIES.slice(0, 5).map(cat => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(
                  selectedCategory === cat.value ? null : cat.value
                )}
                className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${
                  selectedCategory === cat.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                <cat.icon size={14} />
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Add/Edit Form */}
        {(showAddForm || editingItem) && (
          <div className="p-4 bg-gray-50 border-b">
            <h3 className="font-semibold text-gray-900 mb-3">
              {editingItem ? 'Edit Item' : 'Add New Item'}
            </h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Item name (e.g., Cordless Drill)"
                value={formData.item_name}
                onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              
              <div className="flex gap-2">
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
                
                <input
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                  className="w-20 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Qty"
                />
              </div>
              
              <select
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CONDITIONS.map(cond => (
                  <option key={cond.value} value={cond.value}>{cond.label}</option>
                ))}
              </select>
              
              <textarea
                placeholder="Notes (optional)"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={2}
              />
              
              <div className="flex gap-2">
                <button
                  onClick={editingItem ? handleUpdateItem : handleAddItem}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <Check size={18} />
                  {editingItem ? 'Update' : 'Add Item'}
                </button>
                <button
                  onClick={() => {
                    editingItem ? cancelEdit() : setShowAddForm(false);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-900 rounded-lg hover:bg-gray-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Inventory List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-800">
              Loading inventory...
            </div>
          ) : filteredInventory.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="mx-auto text-gray-300 mb-4" size={48} />
              <p className="text-gray-800 mb-2">
                {searchQuery || selectedCategory
                  ? 'No items match your search'
                  : 'Your inventory is empty'}
              </p>
              <p className="text-sm text-gray-700">
                Add items manually or mention tools you own in chat
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {Object.entries(groupedInventory).map(([category, items]) => {
                const catInfo = CATEGORIES.find(c => c.value === category);
                const Icon = catInfo?.icon || Package;
                
                return (
                  <div key={category}>
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <Icon size={16} />
                      {catInfo?.label || category}
                      <span className="text-gray-600 font-normal">({items.length})</span>
                    </h4>
                    <div className="space-y-2">
                      {items.map(item => (
                        <div 
                          key={item.id}
                          className="bg-white border rounded-lg p-3 flex items-center justify-between group hover:shadow-sm transition-shadow"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">
                              {item.item_name}
                              {item.quantity > 1 && (
                                <span className="text-gray-700 font-normal ml-1">
                                  x{item.quantity}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-700 flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-full ${
                                item.condition === 'new' ? 'bg-green-100 text-green-700' :
                                item.condition === 'good' ? 'bg-blue-100 text-blue-700' :
                                item.condition === 'fair' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {item.condition}
                              </span>
                              {item.auto_added && (
                                <span className="text-gray-600">auto-added</span>
                              )}
                            </div>
                            {item.notes && (
                              <p className="text-xs text-gray-700 mt-1">{item.notes}</p>
                            )}
                          </div>
                          
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => startEdit(item)}
                              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add Button */}
        {!showAddForm && !editingItem && (
          <div className="p-4 border-t">
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 font-medium"
            >
              <Plus size={20} />
              Add Item to Inventory
            </button>
          </div>
        )}
      </div>
    </div>
  );
}