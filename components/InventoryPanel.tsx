'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import EmptyState from '@/components/ui/EmptyState';
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
import Textarea from '@/components/ui/Textarea';
import Badge, { type BadgeVariant } from '@/components/ui/Badge';
import IconButton from '@/components/ui/IconButton';

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
  isOpen?: boolean;
  onClose?: () => void;
  standalone?: boolean;
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

function conditionVariant(condition: string): BadgeVariant {
  switch (condition) {
    case 'new': return 'success';
    case 'good': return 'default';
    case 'fair': return 'primary';
    default: return 'warning';
  }
}

const darkInput = 'bg-white/10 text-white border-white/20 placeholder-white/40';

export default function InventoryPanel({ userId, isOpen, onClose, standalone = false }: InventoryPanelProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const [formData, setFormData] = useState({
    item_name: '',
    category: 'general',
    quantity: 1,
    condition: 'good',
    notes: ''
  });

  useEffect(() => {
    if (standalone || isOpen) {
      if (userId) loadInventory();
      else { setLoading(false); setInventory([]); }
    }
  }, [isOpen, userId, standalone]);

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

  const resetForm = () => setFormData({ item_name: '', category: 'general', quantity: 1, condition: 'good', notes: '' });

  const handleAddItem = async () => {
    if (!formData.item_name.trim()) return;
    try {
      const { error } = await supabase.from('user_inventory').insert({
        user_id: userId,
        item_name: formData.item_name.trim(),
        category: formData.category,
        quantity: formData.quantity,
        condition: formData.condition,
        notes: formData.notes || null,
        auto_added: false
      });
      if (error) throw error;
      resetForm();
      setShowAddForm(false);
      loadInventory();
    } catch (err: unknown) {
      const pgError = err as { code?: string };
      if (pgError.code === '23505') alert('This item is already in your inventory!');
      else { console.error('Error adding item:', err); alert('Failed to add item'); }
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem || !formData.item_name.trim()) return;
    try {
      const { error } = await supabase.from('user_inventory')
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
      resetForm();
      loadInventory();
    } catch (err) {
      console.error('Error updating item:', err);
      alert('Failed to update item');
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Remove this item from your inventory?')) return;
    try {
      const { error } = await supabase.from('user_inventory').delete().eq('id', id);
      if (error) throw error;
      loadInventory();
    } catch (err) {
      console.error('Error deleting item:', err);
      alert('Failed to delete item');
    }
  };

  const startEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({ item_name: item.item_name, category: item.category, quantity: item.quantity, condition: item.condition, notes: item.notes || '' });
    setShowAddForm(false);
  };

  const cancelEdit = () => { setEditingItem(null); resetForm(); };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = !searchQuery || item.item_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedInventory = filteredInventory.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, InventoryItem[]>);

  if (!standalone && !isOpen) return null;

  return (
    <div className={standalone ? 'flex flex-col' : 'fixed left-0 md:left-64 top-16 bottom-0 w-[85vw] md:w-80 bg-[#1A1612] border-r border-white/[0.06] z-30 flex flex-col shadow-xl animate-slide-in-left'}>

      {/* Header — hidden in standalone mode (page provides its own heading) */}
      {!standalone && (
        <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
          <div>
            <h2 className="font-serif font-normal text-lg text-white">My Tools</h2>
            <p className="text-xs text-[var(--earth-sand)]/60 mt-0.5">{inventory.length} items</p>
          </div>
          <IconButton icon={X} iconSize={18} label="Close" onClick={onClose} className="text-[var(--earth-sand)] hover:bg-white/10 hover:text-white" />
        </div>
      )}

      {/* Search — only when there are items */}
      {!loading && inventory.length > 0 && <div className="p-3 border-b border-white/[0.06]">
        <TextInput
          type="text"
          placeholder="Search inventory..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={Search}
          iconSize={16}
          inputSize="sm"
          fullWidth
          aria-label="Search inventory"
          className={darkInput}
        />

        {/* Category filter chips */}
        <div className="flex gap-1.5 flex-wrap mt-2.5">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`text-xs px-2.5 py-1 rounded-full transition-colors ${!selectedCategory ? 'bg-rust text-white' : 'bg-white/10 text-[var(--earth-sand)] hover:bg-white/15'}`}
          >
            All
          </button>
          {CATEGORIES.slice(0, 5).map(cat => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(selectedCategory === cat.value ? null : cat.value)}
              className={`text-xs px-2.5 py-1 rounded-full transition-colors ${selectedCategory === cat.value ? 'bg-rust text-white' : 'bg-white/10 text-[var(--earth-sand)] hover:bg-white/15'}`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>}

      {/* Add / Edit form */}
      {(showAddForm || editingItem) && (
        <div className="p-3 border-b border-white/[0.06] bg-white/5 space-y-2">
          <h3 className="text-sm font-medium text-white">
            {editingItem ? 'Edit Item' : 'Add New Item'}
          </h3>
          <TextInput
            type="text"
            placeholder="Item name (e.g., Cordless Drill)"
            value={formData.item_name}
            onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
            inputSize="sm"
            fullWidth
            className={darkInput}
          />
          <div className="flex gap-2">
            <Select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              inputSize="sm"
              className={`flex-1 ${darkInput}`}
            >
              {CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </Select>
            <TextInput
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
              inputSize="sm"
              className={`w-16 ${darkInput}`}
              placeholder="Qty"
            />
          </div>
          <Select
            value={formData.condition}
            onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
            inputSize="sm"
            fullWidth
            className={darkInput}
          >
            {CONDITIONS.map(cond => (
              <option key={cond.value} value={cond.value}>{cond.label}</option>
            ))}
          </Select>
          <Textarea
            placeholder="Notes (optional)"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            resize="none"
            fullWidth
            rows={2}
            className={darkInput}
          />
          <div className="flex gap-2">
            <Button variant="primary" size="sm" fullWidth leftIcon={Check} iconSize={14} onClick={editingItem ? handleUpdateItem : handleAddItem}>
              {editingItem ? 'Update' : 'Add Item'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => editingItem ? cancelEdit() : setShowAddForm(false)} className="text-[var(--earth-sand)] hover:bg-white/10 hover:text-white">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Inventory list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <InventorySkeleton />
        ) : !userId ? (
          <EmptyState icon={Package} title="Sign in to access your tool inventory" description="Your tools will be saved across sessions" className="p-8" />
        ) : filteredInventory.length === 0 ? (
          <EmptyState
            icon={Package}
            title={searchQuery || selectedCategory ? 'No items match your search' : 'Your inventory is empty'}
            description="Add items manually or mention tools you own in chat"
            className="p-8"
          />
        ) : (
          <div className="p-3 space-y-4">
            {Object.entries(groupedInventory).map(([category, items]) => {
              const catInfo = CATEGORIES.find(c => c.value === category);
              const Icon = catInfo?.icon || Package;
              return (
                <div key={category}>
                  <div className="flex items-center gap-2 text-xs font-medium text-white/30 uppercase tracking-wide mb-2">
                    <Icon size={12} />
                    <span>{catInfo?.label || category}</span>
                    <span className="text-white/30">({items.length})</span>
                  </div>
                  <div className="space-y-1">
                    {items.map(item => (
                      <div
                        key={item.id}
                        className="group flex items-center justify-between gap-2 px-3 py-2.5 rounded-none bg-white/5 border border-transparent hover:bg-white/10 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white truncate">
                            {item.item_name}
                            {item.quantity > 1 && (
                              <span className="text-[var(--earth-sand)]/60 font-normal ml-1">×{item.quantity}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <Badge variant={conditionVariant(item.condition)} size="sm">{item.condition}</Badge>
                            {item.auto_added && <Badge variant="neutral" size="sm">auto-added</Badge>}
                          </div>
                          {item.notes && (
                            <p className="text-xs text-[var(--earth-sand)]/50 mt-1 line-clamp-1">{item.notes}</p>
                          )}
                        </div>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <IconButton icon={Edit2} iconSize={14} label="Edit item" onClick={() => startEdit(item)} className="text-[var(--earth-sand)] hover:bg-white/10 hover:text-white" />
                          <IconButton icon={Trash2} iconSize={14} label="Delete item" onClick={() => handleDeleteItem(item.id)} className="text-[var(--earth-sand)] hover:bg-white/10 hover:text-rust" />
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

      {/* Add button */}
      {!showAddForm && !editingItem && userId && (
        <div className="p-3 border-t border-white/[0.06]">
          <Button variant="primary" size="sm" fullWidth leftIcon={Plus} iconSize={16} onClick={() => setShowAddForm(true)}>
            Add Item
          </Button>
        </div>
      )}
    </div>
  );
}
