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
import FixBot from '@/components/FixBot';
import FixSays from '@/components/ui/FixSays';
import Dropdown from '@/components/ui/Dropdown';
import Toggle from '@/components/ui/Toggle';

import {
  Wrench, ArrowRight, Plus, Trash2, Check, X, Home, Settings,
  Bell, Menu, MessageSquare, Users, Package, ShoppingCart, Search, MapPin,
  Gavel, Target, CheckCircle, Star, FolderOpen, HelpCircle, LayoutDashboard,
  ClipboardCheck, Mail, ArrowUp, FolderPlus,
} from 'lucide-react';

// ─── Dark section wrapper ─────────────────────────────────────────────────────
function DarkSection({ title, label, children }: { title: string; label?: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="text-xs font-medium uppercase tracking-widest text-white/40 mb-4 pb-2 border-b border-white/[0.08]">
        {title}
      </h2>
      {label && <p className="text-xs text-white/30 mb-2">{label}</p>}
      <div className="bg-[#4A3F35] rounded-none p-6 space-y-4">
        {children}
      </div>
    </section>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="text-xs font-medium uppercase tracking-widest text-white/40 mb-4 pb-2 border-b border-white/[0.08]">
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
        className={`w-16 h-16 rounded-none shadow-sm border border-white/10 flex items-end p-1`}
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
    <div className="min-h-screen bg-[#2A2520]">
      <div className="max-w-4xl mx-auto px-6 py-12">

        <div className="mb-10">
          <h1 className="font-serif font-normal text-3xl text-white">Design System</h1>
          <p className="text-earth-brown mt-1">Fixerator component library</p>
        </div>

        {/* ── Colors ─────────────────────────────────────────────────────── */}
        <Section title="Color Tokens">
          <Row label="Primary">
            <Swatch color="#B8593B" label="rust" />
            <Swatch color="#D97757" label="rust-glow" />
            <Swatch color="#B87333" label="copper" />
          </Row>
          <Row label="Secondary">
            <Swatch color="#5C7A40" label="forest-green" />
            <Swatch color="#3E5428" label="forest-green-dark" />
          </Row>
          <Row label="Tertiary">
            <Swatch color="#5C7882" label="slate-blue" />
            <Swatch color="#3E5560" label="slate-blue-dark" />
          </Row>
          <Row label="Neutrals">
            <Swatch color="#2A2520" label="background" />
            <Swatch color="#3F3831" label="earth-brown-dark" />
            <Swatch color="#544D45" label="warm-brown" />
            <Swatch color="#756B62" label="earth-brown" />
            <Swatch color="#958C83" label="earth-brown-light" />
            <Swatch color="#AEA8A3" label="muted" textDark />
            <Swatch color="#CAC7C4" label="earth-sand" textDark />
            <Swatch color="#DFDEDD" label="earth-tan" textDark />
            <Swatch color="#EEEDED" label="earth-cream" textDark />
            <Swatch color="#F8F7F7" label="surface" textDark />
          </Row>
          <Row label="Accent">
            <Swatch color="#D4A574" label="gold" textDark />
            <Swatch color="#B87333" label="copper" />
          </Row>
          <Row label="Robot accents · Fixerator palette">
            <Swatch color="#E83A2C" label="bot-eye" />
            <Swatch color="#E8C2B6" label="bot-eye-outer" textDark />
            <Swatch color="#C77A66" label="bot-eye-mid" />
            <Swatch color="#F1ECE5" label="bot-cream" textDark />
            <Swatch color="#FBF8F2" label="bot-cream-hi" textDark />
            <Swatch color="#2E2823" label="bot-visor" />
            <Swatch color="#2A211A" label="bot-outline" />
          </Row>
          <Row label="Status — foreground (dark surface)">
            <Swatch color="#7EA0AD" label="research-fg" />
            <Swatch color="#D97757" label="progress-fg" />
            <Swatch color="#D49A4A" label="waiting-fg" />
            <Swatch color="#7A9A56" label="complete-fg" />
          </Row>
          <Row label="Status — background (dark surface)">
            <Swatch color="#1B2D33" label="research-bg" />
            <Swatch color="#3A1F18" label="progress-bg" />
            <Swatch color="#3A2A14" label="waiting-bg" />
            <Swatch color="#1F2E16" label="complete-bg" />
          </Row>
        </Section>

        {/* ── Typography ──────────────────────────────────────────────────── */}
        <Section title="Typography Scale">
          <div className="space-y-3">
            <div className="flex items-baseline gap-4"><span className="font-serif font-normal text-4xl text-white">Display serif · 48px</span><span className="text-xs text-white/30 font-jetbrains">Newsreader · hero headlines</span></div>
            <div className="flex items-baseline gap-4"><span className="font-serif font-normal text-3xl text-white">Page heading · 36px</span><span className="text-xs text-white/30 font-jetbrains">Newsreader · page titles</span></div>
            <div className="flex items-baseline gap-4"><span className="font-serif font-normal text-2xl text-white">Section heading · 30px</span><span className="text-xs text-white/30 font-jetbrains">Newsreader · h2</span></div>
            <div className="flex items-baseline gap-4"><span className="font-serif font-normal text-xl text-white">Sub-section · 24px</span><span className="text-xs text-white/30 font-jetbrains">Newsreader · h3</span></div>
            <div className="flex items-baseline gap-4"><span className="font-serif font-normal text-lg text-white">Card title · 20px</span><span className="text-xs text-white/30 font-jetbrains">Newsreader · h4</span></div>
            <div className="border-t border-white/[0.06] pt-3" />
            <div className="flex items-baseline gap-4"><span className="text-base text-white/70">text-base · 18px</span><span className="text-xs text-white/30 font-jetbrains">Geist Sans · body</span></div>
            <div className="flex items-baseline gap-4"><span className="text-sm text-white/70">text-sm · 16px</span><span className="text-xs text-white/30 font-jetbrains">Geist Sans · body small</span></div>
            <div className="flex items-baseline gap-4"><span className="text-xs text-white/50">text-xs · 14px</span><span className="text-xs text-white/30 font-jetbrains">Geist Sans · captions, labels (min)</span></div>
            <div className="flex items-baseline gap-4"><span className="text-2xs text-white/30">text-2xs · 12px</span><span className="text-xs text-white/30 font-jetbrains">Geist Sans · timestamps, legal</span></div>
            <div className="border-t border-white/[0.06] pt-3" />
            <div className="flex items-baseline gap-4"><span className="font-serif italic font-normal text-lg text-white/70">Italic serif · labels, hints, FixSays</span><span className="text-xs text-white/30 font-jetbrains">Newsreader Italic</span></div>
            <div className="flex items-baseline gap-4"><span className="font-jetbrains text-sm text-[var(--gold)] tracking-[0.1em] uppercase">MONO LABEL · BADGES</span><span className="text-xs text-white/30 font-jetbrains">JetBrains Mono · uppercase caps</span></div>
          </div>
        </Section>

        {/* ── AppLogo ─────────────────────────────────────────────────────── */}
        <Section title="AppLogo">
          <Row label="Dark surface">
            <div className="bg-[var(--earth-brown-dark)] p-4 rounded-none">
              <AppLogo theme="dark" />
            </div>
          </Row>
          <Row label="Light surface">
            <div className="bg-[var(--earth-cream)] p-4 rounded-none border border-earth-sand">
              <AppLogo theme="light" />
            </div>
          </Row>
          <Row label="Sizes">
            <div className="bg-[var(--earth-brown-dark)] p-4 rounded-none flex items-center gap-6">
              <AppLogo size="sm" />
              <AppLogo size="md" />
              <AppLogo size="lg" />
            </div>
          </Row>
        </Section>

        {/* ── Fix the FIX-3000 mascot ────────────────────────────────────── */}
        <Section title="Fix — the FIX-3000 mascot">
          <Row label="Mascot gallery">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-[var(--earth-cream)] border border-earth-sand rounded-none p-5 flex flex-col items-center gap-2 text-center">
                <span className="fix-float-stage">
                  <FixBot size={80} theme="light" floating />
                </span>
                <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-earth-brown mt-2">
                  Default · Floating
                </p>
                <p className="text-xs italic text-warm-brown">
                  &ldquo;Greetings, hooman. Show me the leak.&rdquo;
                </p>
              </div>
              <div className="bg-[var(--earth-cream)] border border-earth-sand rounded-none p-5 flex flex-col items-center gap-2 text-center">
                <FixBot size={80} theme="light" expression="winking" />
                <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-earth-brown mt-2">
                  Winking
                </p>
                <p className="text-xs italic text-warm-brown">
                  &ldquo;Permits? Already pulled. Trust the bot.&rdquo;
                </p>
              </div>
              <div className="bg-[var(--earth-cream)] border border-earth-sand rounded-none p-5 flex flex-col items-center gap-2 text-center">
                <FixBot size={80} theme="light" expression="computing" />
                <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-earth-brown mt-2">
                  Computing
                </p>
                <p className="text-xs italic text-warm-brown">
                  &ldquo;Calculating studs… please hold your boards.&rdquo;
                </p>
              </div>
              <div className="bg-[var(--earth-brown-dark)] rounded-none p-5 flex flex-col items-center gap-2 text-center">
                <FixBot size={80} theme="dark" expression="terminator" />
                <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-white/60 mt-2">
                  Terminator mode
                </p>
                <p className="text-xs italic text-white/50">
                  &ldquo;Your bathroom regrout will not survive.&rdquo;
                </p>
              </div>
            </div>
          </Row>
          <Row label="Hero pose · nailgun + floating">
            <div className="bg-[var(--earth-brown-dark)] rounded-none p-6 flex justify-center">
              <span className="fix-float-stage">
                <FixBot size={180} theme="dark" withNailgun floating ariaLabel="Fix with nailgun" />
              </span>
            </div>
          </Row>
          <Row label="Thinking pulse">
            <div className="bg-[var(--earth-brown-dark)] rounded-none p-4 inline-flex items-center gap-2">
              <span className="fix-thinking-dot" aria-hidden />
              <span className="font-mono text-xs text-white/70">Fix is computing…</span>
            </div>
          </Row>
        </Section>

        {/* ── FixSays card ────────────────────────────────────────────────── */}
        <Section title="FixSays">
          <Row label="Default">
            <div className="max-w-md">
              <FixSays>
                &ldquo;Heads up — Travis County wants a permit if you&apos;re
                moving the toilet flange. I&apos;ll add it to your checklist.&rdquo;
              </FixSays>
            </div>
          </Row>
          <Row label="With actions">
            <div className="max-w-md">
              <FixSays
                actions={
                  <>
                    <Button size="xs" variant="outline" className="bg-white text-[var(--earth-brown-dark)] border-white">
                      Add to plan
                    </Button>
                    <Button size="xs" variant="ghost" className="text-white/70 hover:bg-white/10">
                      Dismiss
                    </Button>
                  </>
                }
              >
                &ldquo;Materials list locked and loaded — 7 items, ~$184 at your
                nearest Lowe&apos;s.&rdquo;
              </FixSays>
            </div>
          </Row>
          <Row label="Computing expression">
            <div className="max-w-md">
              <FixSays expression="computing" label="Fix is thinking">
                &ldquo;Calculating studs… please hold your boards.&rdquo;
              </FixSays>
            </div>
          </Row>
        </Section>

        {/* ── AppSidebar ──────────────────────────────────────────────────── */}
        <Section title="AppSidebar">
          <div className="flex gap-6 flex-wrap">

            {/* DIYer variant */}
            <div>
              <p className="text-xs text-earth-brown mb-2">DIYer</p>
              <div className="w-64 bg-[#2F2823] rounded-none overflow-hidden flex flex-col" style={{ height: 420 }}>
                <div className="px-[14px] pt-4 pb-3">
                  <AppLogo />
                </div>
                <nav className="px-2 flex-1">
                  <p className="px-[10px] pt-[14px] pb-[6px] font-semibold uppercase text-white/[0.35] tracking-[0.12em]" style={{ fontSize: 10, fontFamily: 'var(--font-jetbrains-mono, monospace)', lineHeight: 1 }}>DIY</p>
                  {[
                    { label: 'My Projects', icon: <FolderOpen size={16} /> },
                    { label: 'My Tools', icon: <Package size={16} />, active: true },
                    { label: 'Shopping', icon: <ShoppingCart size={16} /> },
                  ].map(({ label, icon, active }) => (
                    <div key={label} className={`flex items-center gap-[10px] px-[10px] py-[9px] rounded-none font-medium ${active ? 'bg-white/[0.08] text-white' : 'text-white/[0.35]'}`} style={{ fontSize: 13, lineHeight: 1 }}>
                      {icon}{label}
                    </div>
                  ))}
                  <p className="px-[10px] pt-[14px] pb-[6px] font-semibold uppercase text-white/[0.35] tracking-[0.12em]" style={{ fontSize: 10, fontFamily: 'var(--font-jetbrains-mono, monospace)', lineHeight: 1 }}>Experts</p>
                  {[
                    { label: 'Find an Expert', icon: <Users size={16} /> },
                    { label: 'My Questions', icon: <HelpCircle size={16} /> },
                  ].map(({ label, icon }) => (
                    <div key={label} className="flex items-center gap-[10px] px-[10px] py-[9px] rounded-none font-medium text-white/[0.35]" style={{ fontSize: 13, lineHeight: 1 }}>
                      {icon}{label}
                    </div>
                  ))}
                </nav>
                <div className="px-[14px] py-3 border-t border-white/[0.06] flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#4A3F35] border border-white/[0.08] flex items-center justify-center"><Settings size={14} className="text-white/40" /></div>
                  <div className="flex-1 h-2 rounded bg-white/10" />
                </div>
              </div>
            </div>

            {/* Expert variant */}
            <div>
              <p className="text-xs text-earth-brown mb-2">Expert</p>
              <div className="w-64 bg-[#2F2823] rounded-none overflow-hidden flex flex-col" style={{ height: 560 }}>
                <div className="px-[14px] pt-4 pb-3">
                  <AppLogo />
                </div>
                <nav className="px-2 flex-1">
                  <p className="px-[10px] pt-[14px] pb-[6px] font-semibold uppercase text-white/[0.35] tracking-[0.12em]" style={{ fontSize: 10, fontFamily: 'var(--font-jetbrains-mono, monospace)', lineHeight: 1 }}>DIY</p>
                  {[
                    { label: 'My Projects', icon: <FolderOpen size={16} /> },
                    { label: 'My Tools', icon: <Package size={16} /> },
                    { label: 'Shopping', icon: <ShoppingCart size={16} /> },
                  ].map(({ label, icon }) => (
                    <div key={label} className="flex items-center gap-[10px] px-[10px] py-[9px] rounded-none font-medium text-white/[0.35]" style={{ fontSize: 13, lineHeight: 1 }}>
                      {icon}{label}
                    </div>
                  ))}
                  <p className="px-[10px] pt-[14px] pb-[6px] font-semibold uppercase text-white/[0.35] tracking-[0.12em]" style={{ fontSize: 10, fontFamily: 'var(--font-jetbrains-mono, monospace)', lineHeight: 1 }}>Experts</p>
                  {[
                    { label: 'Find an Expert', icon: <Users size={16} /> },
                    { label: 'My Questions', icon: <HelpCircle size={16} /> },
                  ].map(({ label, icon }) => (
                    <div key={label} className="flex items-center gap-[10px] px-[10px] py-[9px] rounded-none font-medium text-white/[0.35]" style={{ fontSize: 13, lineHeight: 1 }}>
                      {icon}{label}
                    </div>
                  ))}
                  <p className="px-[10px] pt-[14px] pb-[6px] font-semibold uppercase text-white/[0.35] tracking-[0.12em]" style={{ fontSize: 10, fontFamily: 'var(--font-jetbrains-mono, monospace)', lineHeight: 1 }}>Expert</p>
                  {[
                    { label: 'Dashboard', icon: <LayoutDashboard size={16} />, active: true },
                    { label: 'Q&A Queue', icon: <MessageSquare size={16} /> },
                    { label: 'Reviews', icon: <ClipboardCheck size={16} /> },
                    { label: 'Messages', icon: <Mail size={16} /> },
                  ].map(({ label, icon, active }) => (
                    <div key={label} className={`flex items-center gap-[10px] px-[10px] py-[9px] rounded-none font-medium ${active ? 'bg-white/[0.08] text-white' : 'text-white/[0.35]'}`} style={{ fontSize: 13, lineHeight: 1 }}>
                      {icon}{label}
                    </div>
                  ))}
                </nav>
                <div className="px-[14px] py-3 border-t border-white/[0.06] flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#4A3F35] border border-white/[0.08] flex items-center justify-center"><Settings size={14} className="text-white/40" /></div>
                  <div className="flex-1 h-2 rounded bg-white/10" />
                </div>
              </div>
            </div>

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
            <Button variant="tertiary" rightIcon={ArrowRight} href="/">Open Chat</Button>
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
            <TextInput leftIcon={Search} placeholder="Search..." />
            <TextInput leftIcon={MapPin} placeholder="Enter location..." />
            <TextInput leftIcon={Search} rightIcon={X} placeholder="With both icons" />
          </Row>
          <Row label="With label">
            <div className="w-full max-w-sm space-y-3">
              <TextInput id="name" label="Full name" placeholder="Jane Doe" fullWidth />
              <TextInput id="email" label="Email address" placeholder="jane@example.com" leftIcon={Search} fullWidth />
            </div>
          </Row>
          <Row label="States">
            <TextInput placeholder="Default" />
            <TextInput placeholder="Disabled" disabled />
            <TextInput placeholder="Error state" error="This field is required" />
          </Row>
        </Section>

        {/* ── Select ──────────────────────────────────────────────────────── */}
        <Section title="Select">
          <Row label="Sizes">
            <Select inputSize="sm"><option>Small</option><option>Option 2</option></Select>
            <Select inputSize="md"><option>Medium (default)</option><option>Option 2</option></Select>
            <Select inputSize="lg"><option>Large</option><option>Option 2</option></Select>
          </Row>
          <Row label="With label">
            <div className="w-full max-w-sm">
              <Select id="cat" label="Category" fullWidth>
                <option>All categories</option>
                <option>Electrical</option>
                <option>Plumbing</option>
                <option>Carpentry</option>
              </Select>
            </div>
          </Row>
          <Row label="States">
            <Select><option>Default</option></Select>
            <Select disabled><option>Disabled</option></Select>
            <Select error="Please select an option"><option>Error state</option></Select>
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
          <Row label="Default · surface · hover">
            <Card className="w-48">
              <p className="text-sm">Basic card with default padding and border.</p>
            </Card>
            <Card surface className="w-48">
              <p className="text-sm">Surface card · off-white over earth.</p>
            </Card>
            <Card hover className="w-48">
              <p className="text-sm">Hover for shadow & accent border.</p>
            </Card>
          </Row>
          <Row label="Shadows">
            <Card shadow="sm" className="w-48">
              <p className="text-sm">Shadow · sm</p>
            </Card>
            <Card shadow="md" className="w-48">
              <p className="text-sm">Shadow · md</p>
            </Card>
          </Row>
          <Row label="Project card · in context">
            <Card shadow="sm" className="max-w-sm flex-1 space-y-3">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <p className="font-medium text-base text-white leading-tight">Kitchen sink replacement</p>
                  <p className="font-jetbrains text-xs text-[var(--muted)] mt-0.5 tracking-[0.04em]">PR-241 · created 3 days ago</p>
                </div>
                <StatusBadge status="in_progress" size="sm" />
              </div>
              <ProgressBar value={62} variant="primary" size="sm" />
              <div className="flex justify-between items-center">
                <div className="flex gap-1.5">
                  <Badge variant="neutral" size="sm">Plumbing</Badge>
                  <Badge variant="warning" size="sm">Complex</Badge>
                </div>
                <StarRating value={4} size="sm" />
              </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
            <Card padding="lg">
              <EmptyState
                fixBot
                title="No projects yet"
                description="Tell Fix what's broken and we'll figure it out together."
                action={<Button variant="primary" size="sm" leftIcon={Plus}>New project</Button>}
              />
            </Card>
            <Card padding="lg">
              <EmptyState
                icon={MessageSquare}
                title="No conversations yet"
                description="Start chatting to see your history here."
              />
            </Card>
            <Card padding="lg">
              <EmptyState
                icon={Bell}
                iconSize={36}
                title="No notifications yet"
                description="Your alerts will appear here."
              />
            </Card>
            <Card padding="lg">
              <EmptyState
                icon={Users}
                title="No experts found"
                description="Try adjusting your search or filters."
                action={<Button variant="outline" size="sm">Browse all experts</Button>}
              />
            </Card>
          </div>
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
          <div className="max-w-sm space-y-3">
            <Textarea placeholder="Write your message..." rows={3} fullWidth />
            <Textarea label="Project description" placeholder="Describe your project..." rows={3} fullWidth />
            <Textarea label="Notes" placeholder="Add notes..." error="This field is required" rows={2} fullWidth />
            <Textarea placeholder="Disabled" disabled rows={2} fullWidth />
          </div>
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


        {/* ── Dropdown ─────────────────────────────────────────────────────── */}
        <Section title="Dropdown">
          <Row label="Default (right-aligned)">
            <Dropdown
              trigger={
                <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white/70 border border-white/20 rounded-none hover:bg-white/10 hover:text-white transition-colors">
                  Account <span className="text-white/40">▾</span>
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
                <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white/70 border border-white/20 rounded-none hover:bg-white/10 hover:text-white transition-colors">
                  Options <span className="text-white/40">▾</span>
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

        {/* ── Chat ────────────────────────────────────────────────────────── */}
        <Section title="Chat">

          <Row label="Message bubbles">
            <div className="w-full max-w-lg space-y-3">
              <div className="flex justify-end">
                <div className="max-w-[85%] bg-rust text-white rounded-2xl rounded-br-md px-4 py-2.5">
                  <p style={{ fontSize: 14 }}>How do I fix a leaky faucet?</p>
                </div>
              </div>
              <div className="flex justify-start">
                <div className="max-w-[85%] bg-[var(--earth-brown-dark)] border border-white/[0.08] text-[var(--earth-cream)] rounded-2xl rounded-bl-md px-4 py-3">
                  <p style={{ fontSize: 14 }}>Turn off the water supply, remove the handle, replace the washer or cartridge, and reassemble. Most faucet repairs take under 30 minutes.</p>
                </div>
              </div>
              <div className="flex justify-end">
                <div className="max-w-[85%] bg-rust text-white rounded-2xl rounded-br-md px-4 py-2.5">
                  <p style={{ fontSize: 14 }}>What tools do I need?</p>
                </div>
              </div>
              <div className="flex justify-start">
                <div className="max-w-[85%] bg-[var(--earth-brown-dark)] border border-white/[0.08] text-[var(--earth-cream)] rounded-2xl rounded-bl-md px-4 py-3">
                  <p style={{ fontSize: 14 }}>Adjustable wrench, flathead and Phillips screwdrivers, needle-nose pliers, and replacement washers or a cartridge kit.</p>
                </div>
              </div>
            </div>
          </Row>

          <Row label="Loading / typing state">
            <div className="flex justify-start">
              <Spinner size="sm" />
            </div>
          </Row>

          <Row label="Input area">
            <div className="w-full max-w-lg space-y-2">
              <Textarea
                placeholder="Describe your project or ask a question..."
                resize="none"
                fullWidth
                rows={2}
              />
              <div className="flex justify-end">
                <button
                  className="p-2 rounded-none bg-rust text-white hover:bg-copper transition-all"
                  aria-label="Send"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
              </div>
            </div>
          </Row>

          <Row label="Suggestion chips">
            <div className="w-full max-w-lg grid grid-cols-2 gap-2">
              {[
                "I'm mid-project — my mortar isn't setting",
                'Is my electrical panel safe for a hot tub?',
                'Price out a bathroom remodel',
                'What permits do I need for a deck?',
              ].map((text, i) => (
                <Card key={i} padding="sm" hover className="text-left cursor-pointer">
                  <p className="font-medium text-white leading-tight" style={{ fontSize: 13 }}>{text}</p>
                </Card>
              ))}
            </div>
          </Row>

          <Row label="Post-response actions">
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="primary" size="sm" leftIcon={ShoppingCart} iconSize={16}>Save Materials</Button>
              <Button variant="ghost" size="sm" leftIcon={FolderPlus} iconSize={16} className="bg-white/8 text-white/70 hover:text-white hover:bg-white/15 border border-white/10">Save to Project</Button>
            </div>
          </Row>

          <Row label="Error state">
            <div className="bg-rust/20 border border-rust/30 text-earth-cream rounded-lg p-3 w-full max-w-lg" style={{ fontSize: 14 }}>
              Failed to send message.
              <button className="ml-2 underline">Retry</button>
            </div>
          </Row>

          <Row label="Inventory toast">
            <div className="flex items-start gap-2 bg-forest-green/20 border border-forest-green/30 text-earth-cream rounded-lg px-3 py-2.5 w-full max-w-lg" style={{ fontSize: 14 }}>
              <Package className="w-4 h-4 flex-shrink-0 mt-0.5 text-forest-green" />
              <span>Added to inventory: 2x4 lumber, deck screws.</span>
            </div>
          </Row>

        </Section>

      </div>
    </div>
  );
}
