'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
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
import { InventorySkeleton } from './SkeletonLoader';
import Button from '@/components/ui/Button';
import TextInput from '@/components/ui/TextInput';
import Select from '@/components/ui/Select';

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
    if (isOpen) {
      if (userId) {
        loadInventory();
      } else {
        // No user logged in - stop loading immediately
        setLoading(false);
        setInventory([]);
      }
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
    } catch (err: unknown) {
      const pgError = err as { code?: string };
      if (pgError.code === '23505') {
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} position="right">
        {/* Header */}
        <div className="bg-terracotta text-white p-4 flex items-center justify-between safe-area-top">
          <div>
            <h2 className="text-lg sm:text-xl font-bold">My Tool Inventory</h2>
            <p className="text-[var(--status-progress-bg)] text-sm">{inventory.length} items</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-terracotta-dark active:bg-[#8B4D33] rounded-lg transition-colors"
            aria-label="Close inventory panel"
          >
            <X size={24} />
          </button>
        </div>

        {/* Search and Filter */}
        <div className="p-4 border-b border-earth-sand space-y-3">
          <TextInput
            type="text"
            placeholder="Search inventory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={Search}
            iconSize={18}
            fullWidth
            aria-label="Search inventory"
          />

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1 rounded-full text-sm ${
                !selectedCategory
                  ? 'bg-terracotta text-white'
                  : 'bg-earth-cream text-warm-brown hover:bg-earth-tan'
              }`}
              aria-label="Show all categories"
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
                    ? 'bg-terracotta text-white'
                    : 'bg-earth-cream text-warm-brown hover:bg-earth-tan'
                }`}
                aria-label={`Filter by ${cat.label}`}
              >
                <cat.icon size={14} />
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Add/Edit Form */}
        {(showAddForm || editingItem) && (
          <div className="p-4 bg-earth-cream border-b border-earth-sand">
            <h3 className="font-semibold text-foreground mb-3">
              {editingItem ? 'Edit Item' : 'Add New Item'}
            </h3>
            <div className="space-y-3">
              <label htmlFor="inventory-item-name" className="sr-only">Item name</label>
              <TextInput
                id="inventory-item-name"
                type="text"
                placeholder="Item name (e.g., Cordless Drill)"
                value={formData.item_name}
                onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                fullWidth
              />

              <div className="flex gap-2">
                <label htmlFor="inventory-category" className="sr-only">Category</label>
                <Select
                  id="inventory-category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="flex-1"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </Select>

                <label htmlFor="inventory-quantity" className="sr-only">Quantity</label>
                <TextInput
                  id="inventory-quantity"
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                  className="w-20"
                  placeholder="Qty"
                />
              </div>

              <label htmlFor="inventory-condition" className="sr-only">Condition</label>
              <Select
                id="inventory-condition"
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                fullWidth
              >
                {CONDITIONS.map(cond => (
                  <option key={cond.value} value={cond.value}>{cond.label}</option>
                ))}
              </Select>

              <label htmlFor="inventory-notes" className="sr-only">Notes</label>
              <textarea
                id="inventory-notes"
                placeholder="Notes (optional)"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full p-2 border border-earth-sand rounded-lg text-foreground bg-white focus:outline-none focus:ring-2 focus:ring-terracotta resize-none placeholder-earth-brown-light"
                rows={2}
              />

              <div className="flex gap-2">
                <Button
                  variant="primary"
                  fullWidth
                  leftIcon={Check}
                  iconSize={18}
                  onClick={editingItem ? handleUpdateItem : handleAddItem}
                >
                  {editingItem ? 'Update' : 'Add Item'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    editingItem ? cancelEdit() : setShowAddForm(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Inventory List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <InventorySkeleton />
          ) : !userId ? (
            <EmptyState
              icon={Package}
              title="Sign in to access your tool inventory"
              description="Your tools will be saved and remembered across sessions"
              className="p-8"
            />
          ) : filteredInventory.length === 0 ? (
            <EmptyState
              icon={Package}
              title={searchQuery || selectedCategory ? 'No items match your search' : 'Your inventory is empty'}
              description="Add items manually or mention tools you own in chat"
              className="p-8"
            />
          ) : (
            <div className="p-4 space-y-4">
              {Object.entries(groupedInventory).map(([category, items]) => {
                const catInfo = CATEGORIES.find(c => c.value === category);
                const Icon = catInfo?.icon || Package;

                return (
                  <div key={category}>
                    <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                      <Icon size={16} className="text-terracotta" />
                      {catInfo?.label || category}
                      <span className="text-earth-brown font-normal">({items.length})</span>
                    </h4>
                    <div className="space-y-2">
                      {items.map(item => (
                        <div
                          key={item.id}
                          className="bg-white border border-earth-sand rounded-lg p-3 sm:p-3 flex items-center justify-between group hover:shadow-sm transition-shadow"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-foreground text-sm sm:text-base">
                              {item.item_name}
                              {item.quantity > 1 && (
                                <span className="text-earth-brown font-normal ml-1">
                                  x{item.quantity}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-earth-brown flex items-center gap-2 flex-wrap mt-1">
                              <span className={`px-2 py-0.5 rounded-full ${
                                item.condition === 'new' ? 'bg-[var(--status-complete-bg)] text-forest-green' :
                                item.condition === 'good' ? 'bg-[var(--status-research-bg)] text-slate-blue' :
                                item.condition === 'fair' ? 'bg-[var(--status-progress-bg)] text-terracotta' :
                                'bg-[#FADDD0] text-rust'
                              }`}>
                                {item.condition}
                              </span>
                              {item.auto_added && (
                                <span className="text-earth-brown-light">auto-added</span>
                              )}
                            </div>
                            {item.notes && (
                              <p className="text-xs text-earth-brown mt-1 line-clamp-2">{item.notes}</p>
                            )}
                          </div>

                          {/* Always visible on mobile, hover on desktop */}
                          <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0">
                            <button
                              onClick={() => startEdit(item)}
                              className="p-2 text-earth-brown hover:text-slate-blue active:text-slate-blue-dark hover:bg-[var(--status-research-bg)] active:bg-[#D4E4ED] rounded-lg"
                              aria-label="Edit item"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-2 text-earth-brown hover:text-rust active:text-[#9A4830] hover:bg-[#FADDD0] active:bg-[#F5C9B8] rounded-lg"
                              aria-label="Delete item"
                            >
                              <Trash2 size={18} />
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

        {/* Add Button - only show when logged in */}
        {!showAddForm && !editingItem && userId && (
          <div className="p-4 border-t border-earth-sand safe-area-bottom bg-surface">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              leftIcon={Plus}
              iconSize={20}
              onClick={() => setShowAddForm(true)}
            >
              Add Item to Inventory
            </Button>
          </div>
        )}
    </Modal>
  );
}