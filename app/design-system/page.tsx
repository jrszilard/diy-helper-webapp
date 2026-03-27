'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import IconButton from '@/components/ui/IconButton';
import TextInput from '@/components/ui/TextInput';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import Spinner from '@/components/ui/Spinner';
import Alert from '@/components/ui/Alert';
import SectionHeader from '@/components/ui/SectionHeader';
import ProgressBar from '@/components/ui/ProgressBar';
import StarRating from '@/components/ui/StarRating';
import Divider from '@/components/ui/Divider';
import AppLogo from '@/components/AppLogo';
import GlobalHeader from '@/components/GlobalHeader';
import Dropdown from '@/components/ui/Dropdown';
import Toggle from '@/components/ui/Toggle';
import BotMessage, { TypingIndicator } from '@/components/guided-bot/BotMessage';
import UserMessage from '@/components/guided-bot/UserMessage';
import BotInput from '@/components/guided-bot/BotInput';
import ProjectCards from '@/components/guided-bot/ProjectCards';
import ScopeInput from '@/components/guided-bot/ScopeInput';
import LocationInput from '@/components/guided-bot/LocationInput';
import ToolsInput from '@/components/guided-bot/ToolsInput';
import PreferenceCards from '@/components/guided-bot/PreferenceCards';
import ProjectBrief from '@/components/guided-bot/ProjectBrief';
import {
  Wrench, ArrowRight, Plus, Trash2, Check, X, Home, Settings,
  Bell, Menu, MessageSquare, Users, Package, ShoppingCart, Search, MapPin,
  Gavel, Target, CheckCircle, Star,
} from 'lucide-react';

// ─── Dark section wrapper ─────────────────────────────────────────────────────
function DarkSection({ title, label, children }: { title: string; label?: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-earth-brown mb-4 pb-2 border-b border-earth-sand">
        {title}
      </h2>
      {label && <p className="text-xs text-earth-brown mb-2">{label}</p>}
      <div className="bg-[#4A3F35] rounded-xl p-6 space-y-4">
        {children}
      </div>
    </section>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-earth-brown mb-4 pb-2 border-b border-earth-sand">
        {title}
      </h2>
      {children}
    </section>
  );
}

// ─── Row wrapper ─────────────────────────────────────────────────────────────
function Row({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      {label && <p className="text-xs text-earth-brown mb-2">{label}</p>}
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

// ─── Swatch ──────────────────────────────────────────────────────────────────
function Swatch({ color, label, textDark = false }: { color: string; label: string; textDark?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`w-16 h-16 rounded-lg shadow-sm border border-earth-sand flex items-end p-1`}
        style={{ background: color }}
      >
        <span className={`text-[9px] font-mono leading-tight ${textDark ? 'text-foreground' : 'text-white'}`}>
          {color}
        </span>
      </div>
      <span className="text-xs text-earth-brown text-center leading-tight w-16">{label}</span>
    </div>
  );
}

export default function DesignSystemPage() {
  const [modalCenter, setModalCenter] = useState(false);
  const [modalRight, setModalRight] = useState(false);
  const [starValue, setStarValue] = useState(3);

  return (
    <div className="min-h-screen bg-earth-cream">

      {/* Header preview */}
      <GlobalHeader />

      <div className="max-w-4xl mx-auto px-6 py-12">

        <div className="mb-10">
          <h1 className="text-3xl font-bold text-foreground">Design System</h1>
          <p className="text-earth-brown mt-1">DIY Helper component library</p>
        </div>

        {/* ── Colors ─────────────────────────────────────────────────────── */}
        <Section title="Color Tokens">
          <Row label="Primary">
            <Swatch color="#C67B5C" label="terracotta" />
            <Swatch color="#A65D3F" label="terracotta-dark" />
            <Swatch color="#B8593B" label="rust" />
            <Swatch color="#B87333" label="copper" />
          </Row>
          <Row label="Secondary">
            <Swatch color="#4A7C59" label="forest-green" />
            <Swatch color="#2D5A3B" label="forest-green-dark" />
            <Swatch color="#7D9A6F" label="sage" />
          </Row>
          <Row label="Tertiary">
            <Swatch color="#5D7B93" label="slate-blue" />
            <Swatch color="#4A6578" label="slate-blue-dark" />
          </Row>
          <Row label="Neutrals">
            <Swatch color="#3E2723" label="foreground" />
            <Swatch color="#4A3F35" label="earth-brown-dark" />
            <Swatch color="#5C4D42" label="warm-brown" />
            <Swatch color="#7D6B5D" label="earth-brown" />
            <Swatch color="#A89880" label="earth-brown-light" />
            <Swatch color="#B0A696" label="muted" textDark />
            <Swatch color="#D4C8B8" label="earth-sand" textDark />
            <Swatch color="#E8DFD0" label="earth-tan" textDark />
            <Swatch color="#F5F0E6" label="earth-cream" textDark />
            <Swatch color="#FDFBF7" label="surface" textDark />
          </Row>
          <Row label="Accent">
            <Swatch color="#D4A574" label="gold" textDark />
            <Swatch color="#C6943E" label="gold-dark" />
          </Row>
          <Row label="Status — foreground">
            <Swatch color="#5D7B93" label="status-research" />
            <Swatch color="#C67B5C" label="status-progress" />
            <Swatch color="#9B7BA6" label="status-waiting" />
            <Swatch color="#4A7C59" label="status-complete" />
          </Row>
          <Row label="Status — backgrounds">
            <Swatch color="#E8F0F5" label="status-research-bg" textDark />
            <Swatch color="#FDF3ED" label="status-progress-bg" textDark />
            <Swatch color="#F5EEF8" label="status-waiting-bg" textDark />
            <Swatch color="#E8F3EC" label="status-complete-bg" textDark />
          </Row>
        </Section>

        {/* ── Typography ──────────────────────────────────────────────────── */}
        <Section title="Typography Scale">
          <div className="space-y-2">
            <div className="flex items-baseline gap-4"><span className="text-2xl font-bold text-[var(--earth-brown-dark)]">text-2xl bold</span><span className="text-xs text-muted">page headings (size=&quot;lg&quot;)</span></div>
            <div className="flex items-baseline gap-4"><span className="text-lg font-semibold text-[var(--earth-brown-dark)]">text-lg semibold</span><span className="text-xs text-muted">section headings (size=&quot;md&quot;)</span></div>
            <div className="flex items-baseline gap-4"><span className="text-base font-semibold text-[var(--earth-brown-dark)]">text-base semibold</span><span className="text-xs text-muted">sub-headings (size=&quot;sm&quot;)</span></div>
            <div className="flex items-baseline gap-4"><span className="text-sm text-[var(--earth-brown)]">text-sm</span><span className="text-xs text-muted">body text</span></div>
            <div className="flex items-baseline gap-4"><span className="text-xs text-[var(--earth-brown-light)]">text-xs</span><span className="text-xs text-muted">captions, labels</span></div>
            <div className="flex items-baseline gap-4"><span className="text-2xs text-[var(--muted)]">text-2xs</span><span className="text-xs text-muted">micro labels (10px)</span></div>
          </div>
        </Section>

        {/* ── AppLogo ─────────────────────────────────────────────────────── */}
        <Section title="AppLogo">
          <Row label="Light (default)">
            <div className="bg-surface p-4 rounded-lg border border-earth-sand">
              <AppLogo />
            </div>
          </Row>
          <Row label="Dark variant">
            <div className="bg-[#2A2520] p-4 rounded-lg">
              <AppLogo variant="dark" />
            </div>
          </Row>
          <Row label="No label">
            <div className="bg-surface p-4 rounded-lg border border-earth-sand">
              <AppLogo showLabel={false} />
            </div>
          </Row>
        </Section>

        {/* ── GlobalHeader ────────────────────────────────────────────────── */}
        <Section title="GlobalHeader">
          <div className="border border-earth-sand rounded-lg overflow-hidden">
            <GlobalHeader
              right={
                <>
                  <Button variant="ghost" size="sm">Cancel</Button>
                  <Button variant="primary" size="sm">Save</Button>
                </>
              }
            />
          </div>
        </Section>

        {/* ── Button — variants ───────────────────────────────────────────── */}
        <Section title="Button — Variants">
          <Row label="All variants (md size)">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="tertiary">Tertiary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="outline">Outline</Button>
          </Row>
          <Row label="Disabled state">
            <Button variant="primary" disabled>Primary</Button>
            <Button variant="secondary" disabled>Secondary</Button>
            <Button variant="ghost" disabled>Ghost</Button>
            <Button variant="danger" disabled>Danger</Button>
          </Row>
        </Section>

        {/* ── Button — sizes ──────────────────────────────────────────────── */}
        <Section title="Button — Sizes">
          <Row label="primary variant">
            <Button variant="primary" size="xs">Extra Small</Button>
            <Button variant="primary" size="sm">Small</Button>
            <Button variant="primary" size="md">Medium</Button>
            <Button variant="primary" size="lg">Large</Button>
          </Row>
          <Row label="ghost variant">
            <Button variant="ghost" size="xs">Extra Small</Button>
            <Button variant="ghost" size="sm">Small</Button>
            <Button variant="ghost" size="md">Medium</Button>
            <Button variant="ghost" size="lg">Large</Button>
          </Row>
        </Section>

        {/* ── Button — with icons ─────────────────────────────────────────── */}
        <Section title="Button — With Icons">
          <Row label="Left icon">
            <Button variant="primary" leftIcon={Plus}>Add Item</Button>
            <Button variant="secondary" leftIcon={Check}>Accept</Button>
            <Button variant="danger" leftIcon={Trash2}>Delete</Button>
            <Button variant="ghost" leftIcon={X}>Cancel</Button>
          </Row>
          <Row label="Right icon">
            <Button variant="primary" rightIcon={ArrowRight}>Get Started</Button>
            <Button variant="tertiary" rightIcon={ArrowRight} href="/chat">Open Chat</Button>
          </Row>
          <Row label="As link (href)">
            <Button variant="primary" href="/" rightIcon={ArrowRight}>Go Home</Button>
            <Button variant="outline" href="/">Home</Button>
          </Row>
        </Section>

        {/* ── Button — full width ─────────────────────────────────────────── */}
        <Section title="Button — Full Width">
          <div className="max-w-sm space-y-2">
            <Button variant="primary" fullWidth leftIcon={Wrench}>Start My Project</Button>
            <Button variant="outline" fullWidth>Cancel</Button>
          </div>
        </Section>

        {/* ── IconButton ──────────────────────────────────────────────────── */}
        <Section title="IconButton">
          <Row label="Variants">
            <IconButton icon={Bell} label="Notifications" variant="default" />
            <IconButton icon={Plus} label="Add" variant="primary" />
            <IconButton icon={Trash2} label="Delete" variant="danger" />
          </Row>
          <Row label="Common use cases">
            <IconButton icon={Menu} label="Open menu" />
            <IconButton icon={X} label="Close" />
            <IconButton icon={Settings} label="Settings" />
            <IconButton icon={Bell} label="Notifications" />
            <IconButton icon={ShoppingCart} label="Shopping list" />
            <IconButton icon={Package} label="Inventory" />
          </Row>
        </Section>

        {/* ── TextInput ───────────────────────────────────────────────────── */}
        <Section title="TextInput">
          <Row label="Sizes">
            <TextInput inputSize="sm" placeholder="Small" />
            <TextInput inputSize="md" placeholder="Medium (default)" />
            <TextInput inputSize="lg" placeholder="Large" />
          </Row>
          <Row label="With icons">
            <TextInput leftIcon={Search} placeholder="Search..." inputSize="md" />
            <TextInput leftIcon={MapPin} placeholder="Enter location..." inputSize="md" />
            <TextInput leftIcon={Search} rightIcon={X} placeholder="With both icons" inputSize="md" />
          </Row>
          <Row label="States">
            <TextInput placeholder="Default" />
            <TextInput placeholder="Disabled" disabled />
            <TextInput placeholder="Error state" error="This field is required" />
          </Row>
          <Row label="Full width">
            <div className="w-full max-w-sm">
              <TextInput placeholder="Full width input" fullWidth />
            </div>
          </Row>
        </Section>

        {/* ── Select ──────────────────────────────────────────────────────── */}
        <Section title="Select">
          <Row label="Sizes">
            <Select inputSize="sm">
              <option>Small</option>
              <option>Option 2</option>
            </Select>
            <Select inputSize="md">
              <option>Medium (default)</option>
              <option>Option 2</option>
            </Select>
            <Select inputSize="lg">
              <option>Large</option>
              <option>Option 2</option>
            </Select>
          </Row>
          <Row label="States">
            <Select><option>Default</option></Select>
            <Select disabled><option>Disabled</option></Select>
            <Select error="Please select an option"><option>Error state</option></Select>
          </Row>
          <Row label="Full width">
            <div className="w-full max-w-sm">
              <Select fullWidth>
                <option>All categories</option>
                <option>Electrical</option>
                <option>Plumbing</option>
                <option>Carpentry</option>
              </Select>
            </div>
          </Row>
        </Section>

        <Section title="Status Badge">
          <Row label="All statuses (md)">
            <StatusBadge status="research" />
            <StatusBadge status="in_progress" />
            <StatusBadge status="waiting_parts" />
            <StatusBadge status="completed" />
          </Row>
          <Row label="Small size">
            <StatusBadge status="research" size="sm" />
            <StatusBadge status="in_progress" size="sm" />
            <StatusBadge status="waiting_parts" size="sm" />
            <StatusBadge status="completed" size="sm" />
          </Row>
        </Section>

        <Section title="Badge">
          <Row label="Variants">
            <Badge variant="default">Category</Badge>
            <Badge variant="primary">Specialist</Badge>
            <Badge variant="success">Selected</Badge>
            <Badge variant="neutral">Pool</Badge>
            <Badge variant="warning">Complex</Badge>
            <Badge variant="purple">Direct</Badge>
            <Badge variant="solid">Pro</Badge>
          </Row>
          <Row label="With icon">
            <Badge icon={Gavel} variant="primary">Bidding · 3 bids</Badge>
            <Badge icon={Target} variant="purple">Direct</Badge>
            <Badge icon={Users} variant="neutral">Pool</Badge>
            <Badge icon={CheckCircle} variant="success">Selected</Badge>
          </Row>
          <Row label="Sizes">
            <Badge variant="default">Medium (default)</Badge>
            <Badge variant="default" size="sm">Small</Badge>
          </Row>
        </Section>

        <Section title="Card">
          <Row label="Default">
            <Card className="w-48">
              <p className="text-sm text-earth-brown">Basic card with default padding and border.</p>
            </Card>
          </Row>
          <Row label="Surface background">
            <Card surface className="w-48">
              <p className="text-sm text-earth-brown">Surface card (off-white).</p>
            </Card>
          </Row>
          <Row label="With shadow">
            <Card shadow="sm" className="w-48">
              <p className="text-sm text-earth-brown">Shadow sm.</p>
            </Card>
            <Card shadow="md" className="w-48">
              <p className="text-sm text-earth-brown">Shadow md.</p>
            </Card>
          </Row>
          <Row label="Hoverable">
            <Card hover className="w-48">
              <p className="text-sm text-earth-brown">Hover for shadow and accent border.</p>
            </Card>
          </Row>
          <Row label="Rounded variants">
            <Card rounded="lg" className="w-32 text-center">
              <p className="text-xs text-earth-brown">lg</p>
            </Card>
            <Card rounded="xl" className="w-32 text-center">
              <p className="text-xs text-earth-brown">xl</p>
            </Card>
            <Card rounded="2xl" className="w-32 text-center">
              <p className="text-xs text-earth-brown">2xl</p>
            </Card>
          </Row>
        </Section>

        <Section title="Avatar">
          <Row label="Sizes">
            <Avatar name="Wilmarie Huertas" size="sm" />
            <Avatar name="Wilmarie Huertas" />
            <Avatar name="Wilmarie Huertas" size="lg" />
          </Row>
          <Row label="With photo">
            <Avatar name="Jane Doe" src="https://i.pravatar.cc/150?img=47" size="sm" />
            <Avatar name="Jane Doe" src="https://i.pravatar.cc/150?img=47" />
            <Avatar name="Jane Doe" src="https://i.pravatar.cc/150?img=47" size="lg" />
          </Row>
          <Row label="Initial fallback (null src)">
            <Avatar name="Alex Builder" src={null} size="sm" />
            <Avatar name="Alex Builder" src={null} />
            <Avatar name="?" src={null} />
          </Row>
        </Section>

        <Section title="Modal">
          <Row label="Center dialog">
            <Button variant="outline" size="sm" onClick={() => setModalCenter(true)}>Open dialog</Button>
            <Modal isOpen={modalCenter} onClose={() => setModalCenter(false)} title="Example Dialog">
              <p className="text-sm text-earth-brown mb-4">
                This is a center-aligned dialog. It supports a title, close button, Escape key, and backdrop click to dismiss.
              </p>
              <div className="flex gap-2">
                <Button variant="primary" size="sm" onClick={() => setModalCenter(false)}>Confirm</Button>
                <Button variant="ghost" size="sm" onClick={() => setModalCenter(false)}>Cancel</Button>
              </div>
            </Modal>
          </Row>
          <Row label="Right slide-in panel">
            <Button variant="outline" size="sm" onClick={() => setModalRight(true)}>Open panel</Button>
            <Modal isOpen={modalRight} onClose={() => setModalRight(false)} position="right" title="Side Panel">
              <div className="p-4">
                <p className="text-sm text-earth-brown">
                  This is a right-aligned slide-in panel. Used for inventory, conversation history, and other drawer-style UIs.
                </p>
              </div>
            </Modal>
          </Row>
          <Row label="Sizes">
            <span className="text-xs text-earth-brown-light">sm · md (default) · lg — pass <code>size</code> prop to center dialog</span>
          </Row>
        </Section>

        <Section title="Empty State">
          <Row label="With icon + title + description">
            <div className="w-full max-w-sm bg-surface border border-earth-sand rounded-xl p-6">
              <EmptyState
                icon={MessageSquare}
                title="No conversations yet"
                description="Start chatting to see your history here"
              />
            </div>
          </Row>
          <Row label="Icon + description only (sm)">
            <div className="w-full max-w-sm bg-surface border border-earth-sand rounded-xl p-6">
              <EmptyState
                icon={Bell}
                iconSize={24}
                size="sm"
                description="No notifications yet"
              />
            </div>
          </Row>
          <Row label="With subtext">
            <div className="w-full max-w-sm bg-surface border border-earth-sand rounded-xl p-6">
              <EmptyState
                icon={Package}
                size="sm"
                description="No messages yet"
                subtext="Your conversations will appear here"
              />
            </div>
          </Row>
          <Row label="No icon">
            <div className="w-full max-w-sm bg-surface border border-earth-sand rounded-xl p-6">
              <EmptyState description="No questions match your filter" />
            </div>
          </Row>
          <Row label="With action">
            <div className="w-full max-w-sm bg-surface border border-earth-sand rounded-xl p-6">
              <EmptyState
                icon={Users}
                title="No experts found"
                description="Try adjusting your search or filters"
                action={<Button variant="primary" size="sm">Browse all experts</Button>}
              />
            </div>
          </Row>
        </Section>

        {/* ── Spinner ──────────────────────────────────────────────────────── */}
        <Section title="Spinner">
          <Row label="Sizes">
            <Spinner size="sm" />
            <Spinner size="md" />
            <Spinner size="lg" />
          </Row>
          <Row label="Colors">
            <Spinner color="default" />
            <Spinner color="primary" />
            <Spinner color="blue" />
            <Spinner color="green" />
          </Row>
        </Section>

        {/* ── Textarea ─────────────────────────────────────────────────────── */}
        <Section title="Textarea">
          <Row label="Default">
            <div className="w-full max-w-sm">
              <Textarea placeholder="Write your message..." rows={3} fullWidth />
            </div>
          </Row>
          <Row label="With label">
            <div className="w-full max-w-sm">
              <Textarea label="Project description" placeholder="Describe your project..." rows={4} fullWidth />
            </div>
          </Row>
          <Row label="Error state">
            <div className="w-full max-w-sm">
              <Textarea label="Notes" placeholder="Add notes..." error="This field is required" rows={3} fullWidth />
            </div>
          </Row>
          <Row label="Disabled">
            <div className="w-full max-w-sm">
              <Textarea placeholder="Disabled" disabled rows={2} fullWidth />
            </div>
          </Row>
        </Section>

        {/* ── Alert ────────────────────────────────────────────────────────── */}
        <Section title="Alert">
          <div className="space-y-3 max-w-lg">
            <Alert variant="info" title="Info">Your project has been saved and is ready for review.</Alert>
            <Alert variant="success" title="Success">Expert selected! They will respond within 2 hours.</Alert>
            <Alert variant="warning" title="Warning">Your free tier is almost full. Upgrade to continue.</Alert>
            <Alert variant="error" title="Error">Something went wrong. Please try again later.</Alert>
            <Alert variant="info">No title — just a plain informational message.</Alert>
          </div>
        </Section>

        {/* ── SectionHeader ────────────────────────────────────────────────── */}
        <Section title="SectionHeader">
          <div className="space-y-6 max-w-lg">
            <SectionHeader size="lg" title="My Projects" subtitle="All your active and completed projects" />
            <SectionHeader size="md" title="Recent Activity" subtitle="Last 30 days" action={<Button variant="outline" size="sm">View all</Button>} />
            <SectionHeader size="sm" title="Filters" />
          </div>
        </Section>

        {/* ── ProgressBar ──────────────────────────────────────────────────── */}
        <Section title="ProgressBar">
          <div className="space-y-4 max-w-sm">
            <ProgressBar value={60} variant="primary" label="Project completion" showValue />
            <ProgressBar value={80} variant="success" label="Answered questions" showValue />
            <ProgressBar value={35} variant="warning" label="Storage used" showValue />
            <ProgressBar value={20} variant="default" />
          </div>
          <Row label="Sizes">
            <div className="w-full max-w-sm space-y-2">
              <ProgressBar value={50} size="sm" variant="primary" />
              <ProgressBar value={50} size="md" variant="primary" />
              <ProgressBar value={50} size="lg" variant="primary" />
            </div>
          </Row>
        </Section>

        {/* ── Toggle ───────────────────────────────────────────────────────── */}
        <Section title="Toggle">
          <Row label="With label + description">
            <div className="w-full max-w-sm space-y-3">
              <Toggle label="Available for Work" description="Toggle off to pause receiving new questions" checked={true} onChange={() => {}} />
              <Toggle label="Email notifications" checked={false} onChange={() => {}} />
            </div>
          </Row>
          <Row label="Disabled">
            <div className="w-full max-w-sm">
              <Toggle label="Locked setting" checked={true} onChange={() => {}} disabled />
            </div>
          </Row>
          <Row label="Standalone (no label)">
            <Toggle checked={true} onChange={() => {}} />
            <Toggle checked={false} onChange={() => {}} />
          </Row>
        </Section>

        {/* ── StarRating ───────────────────────────────────────────────────── */}
        <Section title="StarRating">
          <Row label="Display only">
            <StarRating value={5} />
            <StarRating value={3.7} />
            <StarRating value={1} />
          </Row>
          <Row label="Sizes">
            <StarRating value={4} size="sm" />
            <StarRating value={4} size="md" />
            <StarRating value={4} size="lg" />
          </Row>
          <Row label="Interactive">
            <div className="flex items-center gap-3">
              <StarRating value={starValue} onChange={setStarValue} size="lg" />
              <span className="text-sm text-earth-brown">{starValue} / 5</span>
            </div>
          </Row>
        </Section>

        {/* ── Divider ──────────────────────────────────────────────────────── */}
        <Section title="Divider">
          <div className="max-w-sm space-y-4">
            <Divider />
            <Divider label="or" />
            <Divider label="Project Details" />
          </div>
        </Section>

        {/* ── TextInput with label ─────────────────────────────────────────── */}
        <Section title="TextInput — With Label">
          <Row label="Folded label prop">
            <div className="w-full max-w-sm space-y-3">
              <TextInput id="name" label="Full name" placeholder="Jane Doe" fullWidth />
              <TextInput id="email" label="Email address" placeholder="jane@example.com" leftIcon={Search} fullWidth />
              <TextInput id="err" label="Zip code" placeholder="00000" error="Invalid zip code" fullWidth />
            </div>
          </Row>
        </Section>

        {/* ── Dropdown ─────────────────────────────────────────────────────── */}
        <Section title="Dropdown">
          <Row label="Default (right-aligned)">
            <Dropdown
              trigger={
                <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-earth-brown-dark border border-earth-sand rounded-lg hover:bg-earth-tan transition-colors">
                  Account <span className="text-earth-brown">▾</span>
                </button>
              }
              items={[
                { label: 'My Projects', icon: Home, href: '/chat' },
                { label: 'Settings', icon: Settings, href: '/settings' },
                { label: 'Sign Out', icon: X, danger: true, dividerBefore: true, onClick: () => {} },
              ]}
            />
          </Row>
          <Row label="Left-aligned + divider groups">
            <Dropdown
              align="left"
              trigger={
                <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-earth-brown-dark border border-earth-sand rounded-lg hover:bg-earth-tan transition-colors">
                  Options <span className="text-earth-brown">▾</span>
                </button>
              }
              items={[
                { label: 'Edit', icon: Settings, onClick: () => {} },
                { label: 'Duplicate', icon: Plus, onClick: () => {} },
                { label: 'Delete', icon: Trash2, danger: true, dividerBefore: true, onClick: () => {} },
              ]}
            />
          </Row>
        </Section>

        {/* ── Dark Theme — Bot Messages ────────────────────────────────────── */}
        <DarkSection title="Dark Theme — Bot Messages" label="BotMessage · UserMessage · TypingIndicator">
          <BotMessage content="Hi! What are you building today?" animate={false} />
          <UserMessage content="I want to build a 12x16 deck in my backyard" />
          <BotMessage content="Great choice! A 12×16 deck is a manageable weekend project. **What city and state** is this in? Local codes affect the build." animate={false} />
          <TypingIndicator />
        </DarkSection>

        {/* ── Dark Theme — BotInput ────────────────────────────────────────── */}
        <DarkSection title="Dark Theme — BotInput" label="Initial state: large textarea with send button">
          <BotInput phase="project" onSend={() => {}} disabled={false} />
        </DarkSection>

        {/* ── Dark Theme — ProjectCards ────────────────────────────────────── */}
        <DarkSection title="Dark Theme — ProjectCards" label="Quick-select project tiles shown before conversation starts">
          <ProjectCards onSelectProject={() => {}} />
        </DarkSection>

        {/* ── Dark Theme — ScopeInput ──────────────────────────────────────── */}
        <DarkSection title="Dark Theme — ScopeInput" label="Context-aware dimension + details form">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-white/40 mb-2">outdoor</p>
              <ScopeInput projectType="outdoor" onSubmit={() => {}} />
            </div>
            <div>
              <p className="text-xs text-white/40 mb-2">electrical</p>
              <ScopeInput projectType="electrical" onSubmit={() => {}} />
            </div>
          </div>
        </DarkSection>

        {/* ── Dark Theme — LocationInput ───────────────────────────────────── */}
        <DarkSection title="Dark Theme — LocationInput" label="City + state selection">
          <div className="max-w-sm">
            <LocationInput onSubmit={() => {}} />
          </div>
        </DarkSection>

        {/* ── Dark Theme — ToolsInput ──────────────────────────────────────── */}
        <DarkSection title="Dark Theme — ToolsInput" label="Optional tools & materials textarea with skip">
          <div className="max-w-sm">
            <ToolsInput onSubmit={() => {}} onSkip={() => {}} />
          </div>
        </DarkSection>

        {/* ── Dark Theme — PreferenceCards ─────────────────────────────────── */}
        <DarkSection title="Dark Theme — PreferenceCards" label="Experience and budget selection cards">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-white/40 mb-2">experience</p>
              <PreferenceCards type="experience" onSelect={() => {}} />
            </div>
            <div>
              <p className="text-xs text-white/40 mb-2">budget</p>
              <PreferenceCards type="budget" onSelect={() => {}} />
            </div>
          </div>
        </DarkSection>

        {/* ── Dark Theme — ProjectBrief ────────────────────────────────────── */}
        <DarkSection title="Dark Theme — ProjectBrief" label="Summary card before generating the plan">
          <div className="max-w-sm">
            <ProjectBrief
              gathered={{
                projectType: 'outdoor',
                projectDescription: 'Build a 12x16 pressure-treated deck',
                dimensions: '12x16 feet',
                scopeDetails: 'Flat yard, no existing structure',
                city: 'Austin',
                state: 'Texas',
                experienceLevel: 'intermediate',
                budgetLevel: 'mid-range',
                existingTools: 'drill, circular saw, tape measure',
                timeframe: null,
              }}
              onEdit={() => {}}
              onSubmit={() => {}}
              isSubmitting={false}
            />
          </div>
        </DarkSection>

      </div>
    </div>
  );
}
