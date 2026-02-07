import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { 
  Guest, 
  GuestSide, 
  GuestGender, 
  GuestType,
  GuestRole,
  RsvpStatus,
  GuestGroup,
  WeddingEventConfig,
  GuestManagerData 
} from '../types';
import { Users, Plus, Trash, Edit, X, Check, ChevronDown } from './Icons';

// ============================================================
// CONSTANTS
// ============================================================

const generateId = (): string => Math.random().toString(36).substring(2, 9);

const GUEST_ROLES: { value: GuestRole; label: string; shortLabel: string; icon: string }[] = [
  { value: 'guest', label: 'Guest', shortLabel: 'Guest', icon: '👤' },
  { value: 'vip', label: 'VIP / Close Family', shortLabel: 'VIP', icon: '⭐' },
  { value: 'bridesmaid', label: 'Bridesmaid', shortLabel: 'Bridesmaid', icon: '👗' },
  { value: 'groomsman', label: 'Groomsman', shortLabel: 'Groomsman', icon: '🤵' },
  { value: 'colleague', label: 'Colleague', shortLabel: 'Colleague', icon: '💼' },
  { value: 'wali', label: 'Wali', shortLabel: 'Wali', icon: '📜' },
  { value: 'witness', label: 'Witness', shortLabel: 'Witness', icon: '✍️' },
];

// Categorized event presets
const ALL_EVENT_PRESETS: { category: string; events: Omit<WeddingEventConfig, 'enabled'>[] }[] = [
  { category: 'Core', events: [
    { id: 'nikkah', name: 'Nikkah', icon: '💍' },
    { id: 'walima', name: 'Walima', icon: '🍽️' },
  ]},
  { category: 'South Asian', events: [
    { id: 'mehndi', name: 'Mehndi', icon: '🌸' },
    { id: 'dholki', name: 'Dholki', icon: '🪘' },
    { id: 'baraat', name: 'Baraat', icon: '🐴' },
  ]},
  { category: 'Arab', events: [
    { id: 'katb-kitab', name: 'Katb Kitab', icon: '📖' },
    { id: 'henna', name: 'Henna Night', icon: '🤲' },
    { id: 'zaffe', name: 'Zaffe', icon: '🎵' },
  ]},
  { category: 'Western / Civil', events: [
    { id: 'civil', name: 'Civil Registry', icon: '📝' },
    { id: 'reception', name: 'Reception', icon: '🥂' },
    { id: 'rehearsal', name: 'Rehearsal Dinner', icon: '🍷' },
  ]},
];

const DEFAULT_EVENTS: WeddingEventConfig[] = [
  { id: 'nikkah', name: 'Nikkah', icon: '💍', enabled: true },
  { id: 'walima', name: 'Walima', icon: '🍽️', enabled: true },
  { id: 'mehndi', name: 'Mehndi', icon: '🌸', enabled: false },
  { id: 'dholki', name: 'Dholki', icon: '🪘', enabled: false },
  { id: 'civil', name: 'Civil Registry', icon: '📝', enabled: false },
];

// Auto-capitalize: "john smith" => "John Smith"
const autoCapitalize = (name: string): string => {
  return name.replace(/\b\w/g, c => c.toUpperCase());
};

const getDefaultGuestManagerData = (): GuestManagerData => ({
  guests: [],
  groups: [],
  events: DEFAULT_EVENTS,
  segregationMode: false,
});

// ============================================================
// HELPERS
// ============================================================

const createGuest = (
  name: string,
  side: GuestSide,
  gender: GuestGender,
  type: GuestType,
  role: GuestRole,
  invitedTo: string[],
  groupId?: string
): Guest => ({
  id: generateId(),
  name: autoCapitalize(name),
  side,
  gender,
  type,
  role,
  rsvpStatus: 'pending',
  groupId,
  invitedTo,
  seating: {},
  createdAt: new Date().toISOString(),
});

// CSV Template generation
const generateCSVTemplate = (): string => {
  const headers = ['Name', 'Group/Family', 'Side (groom/bride/joint)', 'Gender (male/female)', 'Type (adult/child)', 'Role (guest/vip/colleague/wali/witness)', 'Phone'];
  const exampleRows = [
    ['John Smith', 'The Smith Family', 'groom', 'male', 'adult', 'vip', '+44 123 456 7890'],
    ['Jane Smith', 'The Smith Family', 'groom', 'female', 'adult', 'vip', ''],
    ['Ahmed Khan', '', 'bride', 'male', 'adult', 'guest', ''],
  ];
  return [headers.join(','), ...exampleRows.map(r => r.map(f => `"${f}"`).join(','))].join('\n');
};

// CSV Parsing
const parseCSV = (text: string): string[][] => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') { currentField += '"'; i++; }
        else inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') { inQuotes = true; }
      else if (char === ',') { currentRow.push(currentField.trim()); currentField = ''; }
      else if (char === '\n' || (char === '\r' && text[i + 1] === '\n')) {
        if (char === '\r') i++;
        currentRow.push(currentField.trim());
        if (currentRow.some(f => f)) rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }
  currentRow.push(currentField.trim());
  if (currentRow.some(f => f)) rows.push(currentRow);
  return rows;
};

// Format guests for clipboard
const formatGuestListForClipboard = (guests: Guest[], groups: GuestGroup[], enabledEvents: WeddingEventConfig[]): string => {
  const lines: string[] = ['Guest List', '='.repeat(40), ''];
  
  // Group guests by family
  const familyMap = new Map<string, { group: GuestGroup; members: Guest[] }>();
  const ungrouped: Guest[] = [];
  
  groups.forEach(g => familyMap.set(g.id, { group: g, members: [] }));
  guests.forEach(g => {
    if (g.groupId && familyMap.has(g.groupId)) {
      familyMap.get(g.groupId)!.members.push(g);
    } else {
      ungrouped.push(g);
    }
  });

  familyMap.forEach(({ group, members }) => {
    if (members.length === 0) return;
    lines.push(`${group.name} (${members.length} members)`);
    members.forEach(m => {
      const side = m.side === 'groom' ? "Groom's" : m.side === 'bride' ? "Bride's" : 'Both';
      const events = enabledEvents.filter(e => m.invitedTo.includes(e.id)).map(e => e.name).join(', ');
      lines.push(`  - ${m.name} | ${side} | ${m.gender === 'male' ? 'M' : 'F'} | ${m.type} | ${events}`);
    });
    lines.push('');
  });

  if (ungrouped.length > 0) {
    lines.push('Individual Guests');
    ungrouped.forEach(m => {
      const side = m.side === 'groom' ? "Groom's" : m.side === 'bride' ? "Bride's" : 'Both';
      const events = enabledEvents.filter(e => m.invitedTo.includes(e.id)).map(e => e.name).join(', ');
      lines.push(`  - ${m.name} | ${side} | ${m.gender === 'male' ? 'M' : 'F'} | ${m.type} | ${events}`);
    });
  }

  lines.push('', `Total: ${guests.length} guests`);
  return lines.join('\n');
};

// ============================================================
// ADDITIONAL ICONS
// ============================================================

const SettingsIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const DownloadIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
  </svg>
);

const UploadIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>
  </svg>
);

const ClipboardIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
  </svg>
);

const FileTextIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/>
  </svg>
);

const MoveIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m18 8 4 4-4 4"/><path d="M2 12h20"/><path d="m6 8-4 4 4 4"/>
  </svg>
);

// ============================================================
// DATA MIGRATION
// ============================================================

const migrateData = (stored: Partial<GuestManagerData>): GuestManagerData => {
  const defaults = getDefaultGuestManagerData();
  
  // Merge events: keep existing states, add new presets that don't exist
  const existingEventIds = new Set((stored.events || []).map(e => e.id));
  const allPresetEventsList = ALL_EVENT_PRESETS.flatMap(cat => cat.events);
  const newPresets = allPresetEventsList
    .filter(pe => !existingEventIds.has(pe.id))
    .map(pe => ({ ...pe, enabled: false }));
  
  const migratedEvents = [
    ...(stored.events || defaults.events),
    ...newPresets,
  ];

  return {
    guests: (stored.guests || []).map(g => ({
      ...g,
      role: g.role || 'guest',
      rsvpStatus: (g as any).rsvpStatus || 'pending',
      groupId: g.groupId || undefined,
      tableNumber: g.tableNumber || undefined,
    })),
    groups: (stored.groups || []).map(g => ({
      ...g,
      tableNumber: g.tableNumber || undefined,
    })),
    events: migratedEvents,
    segregationMode: stored.segregationMode ?? false,
  };
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export const GuestManager: React.FC = () => {
  // Persisted data with migration
  const [rawData, setRawData] = useLocalStorage<GuestManagerData>(
    'guest-manager-data',
    getDefaultGuestManagerData()
  );
  const data = useMemo(() => migrateData(rawData), [rawData]);
  const setData = (updater: (prev: GuestManagerData) => GuestManagerData) => {
    setRawData(prev => updater(migrateData(prev)));
  };

  // UI State
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [segregationTab, setSegregationTab] = useState<'all' | 'men' | 'women'>('all');
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [addMode, setAddMode] = useState<'individual' | 'family'>('individual');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'group' | 'guest'; id: string; name: string; memberCount?: number } | null>(null);
  const [moveMenuGuestId, setMoveMenuGuestId] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<{ guests: Partial<Guest>[]; groups: string[] } | null>(null);
  const [newCustomEventName, setNewCustomEventName] = useState('');
  const [newCustomEventIcon, setNewCustomEventIcon] = useState('🎉');
  const [clipboardCopied, setClipboardCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const moveMenuRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const membersListRef = useRef<HTMLDivElement>(null);

  // Individual guest form
  const [individualForm, setIndividualForm] = useState({
    name: '',
    side: 'groom' as GuestSide,
    gender: 'male' as GuestGender,
    type: 'adult' as GuestType,
    role: 'guest' as GuestRole,
    invitedTo: [] as string[],
    tableNumber: '',
  });

  // Family form
  const [familyForm, setFamilyForm] = useState({
    familyName: '',
    side: 'groom' as GuestSide,
    invitedTo: [] as string[],
    tableNumber: '',
    members: [
      { name: '', gender: 'male' as GuestGender, type: 'adult' as GuestType, role: 'vip' as GuestRole },
      { name: '', gender: 'female' as GuestGender, type: 'adult' as GuestType, role: 'vip' as GuestRole },
    ],
  });

  // ============================================================
  // MEMOS
  // ============================================================

  const enabledEvents = useMemo(() => data.events.filter(e => e.enabled), [data.events]);

  // Filtered guests: by event + optionally by gender (segregation)
  const filteredGuests = useMemo(() => {
    let guests = activeFilter === 'all' ? data.guests : data.guests.filter(g => g.invitedTo.includes(activeFilter));
    if (data.segregationMode && segregationTab === 'men') {
      guests = guests.filter(g => g.gender === 'male');
    } else if (data.segregationMode && segregationTab === 'women') {
      guests = guests.filter(g => g.gender === 'female');
    }
    return guests;
  }, [data.guests, data.segregationMode, activeFilter, segregationTab]);

  // Organized guests (grouped + ungrouped)
  const organizedGuests = useMemo(() => {
    const grouped: { group: GuestGroup; members: Guest[] }[] = [];
    const ungrouped: Guest[] = [];

    data.groups.forEach(group => {
      const members = filteredGuests.filter(g => g.groupId === group.id);
      if (members.length > 0) grouped.push({ group, members });
    });

    filteredGuests.forEach(guest => {
      if (!guest.groupId) ungrouped.push(guest);
    });

    return { grouped, ungrouped };
  }, [data.groups, filteredGuests]);

  // Stats
  const stats = useMemo(() => {
    const eventGuests = activeFilter === 'all'
      ? data.guests
      : data.guests.filter(g => g.invitedTo.includes(activeFilter));
    
    return {
      total: eventGuests.length,
      adults: eventGuests.filter(g => g.type === 'adult').length,
      children: eventGuests.filter(g => g.type === 'child').length,
      groomSide: eventGuests.filter(g => g.side === 'groom').length,
      brideSide: eventGuests.filter(g => g.side === 'bride').length,
      jointSide: eventGuests.filter(g => g.side === 'joint').length,
      males: eventGuests.filter(g => g.gender === 'male').length,
      females: eventGuests.filter(g => g.gender === 'female').length,
      families: data.groups.length,
      confirmed: eventGuests.filter(g => g.rsvpStatus === 'confirmed').length,
      declined: eventGuests.filter(g => g.rsvpStatus === 'declined').length,
      pending: eventGuests.filter(g => g.rsvpStatus === 'pending').length,
    };
  }, [data.guests, data.groups, activeFilter]);

  // ============================================================
  // EFFECTS
  // ============================================================

  // Context-aware defaults based on active filter
  useEffect(() => {
    const events = activeFilter === 'all' ? enabledEvents.map(e => e.id) : [activeFilter];
    setIndividualForm(prev => ({ ...prev, invitedTo: events }));
    setFamilyForm(prev => ({ ...prev, invitedTo: events }));
  }, [activeFilter, enabledEvents]);

  // Close menus on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moveMenuRef.current && !moveMenuRef.current.contains(e.target as Node)) setMoveMenuGuestId(null);
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) setShowExportMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Reset segregation tab when mode is turned off
  useEffect(() => {
    if (!data.segregationMode) setSegregationTab('all');
  }, [data.segregationMode]);

  // Toast auto-dismiss
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // ============================================================
  // HANDLERS
  // ============================================================

  const toggleGroupExpanded = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(groupId) ? next.delete(groupId) : next.add(groupId);
      return next;
    });
  };

  // Add individual guest
  const handleAddIndividual = () => {
    if (!individualForm.name.trim() || individualForm.invitedTo.length === 0) return;
    const newGuest = createGuest(
      individualForm.name.trim(), individualForm.side, individualForm.gender,
      individualForm.type, individualForm.role, individualForm.invitedTo
    );
    if (individualForm.tableNumber.trim()) newGuest.tableNumber = individualForm.tableNumber.trim();
    setData(prev => ({ ...prev, guests: [...prev.guests, newGuest] }));
    setIndividualForm(prev => ({ ...prev, name: '', tableNumber: '' }));
  };

  // Add family group
  const handleAddFamily = () => {
    const validMembers = familyForm.members.filter(m => m.name.trim());
    if (validMembers.length === 0 || familyForm.invitedTo.length === 0) return;

    const groupId = generateId();
    const familyName = familyForm.familyName.trim() ||
      `The ${validMembers[0].name.split(' ').pop() || 'Guest'} Group`;

    const newGroup: GuestGroup = { id: groupId, name: familyName, memberIds: [], createdAt: new Date().toISOString() };
    if (familyForm.tableNumber.trim()) newGroup.tableNumber = familyForm.tableNumber.trim();
    const newGuests: Guest[] = validMembers.map(member =>
      createGuest(member.name.trim(), familyForm.side, member.gender, member.type, member.role, familyForm.invitedTo, groupId)
    );
    newGroup.memberIds = newGuests.map(g => g.id);

    setExpandedGroups(prev => new Set([...prev, groupId]));
    setData(prev => ({ ...prev, guests: [...prev.guests, ...newGuests], groups: [...prev.groups, newGroup] }));
    setFamilyForm({
      familyName: '', side: 'groom', invitedTo: enabledEvents.map(e => e.id), tableNumber: '',
      members: [
        { name: '', gender: 'male', type: 'adult', role: 'vip' },
        { name: '', gender: 'female', type: 'adult', role: 'vip' },
      ],
    });
  };

  const addFamilyMember = () => {
    setFamilyForm(prev => ({
      ...prev, members: [...prev.members, { name: '', gender: 'male', type: 'child', role: 'guest' }]
    }));
    // Scroll to bottom and focus new member after render
    setTimeout(() => {
      if (membersListRef.current) {
        membersListRef.current.scrollTop = membersListRef.current.scrollHeight;
        const inputs = membersListRef.current.querySelectorAll<HTMLInputElement>('input[type="text"]');
        const lastInput = inputs[inputs.length - 1];
        if (lastInput) lastInput.focus({ preventScroll: true });
      }
    }, 50);
  };

  const removeFamilyMember = (index: number) => {
    if (familyForm.members.length <= 1) return;
    setFamilyForm(prev => ({ ...prev, members: prev.members.filter((_, i) => i !== index) }));
  };

  const updateFamilyMember = (index: number, field: string, value: string) => {
    setFamilyForm(prev => ({
      ...prev, members: prev.members.map((m, i) => i === index ? { ...m, [field]: value } : m)
    }));
  };

  // Delete guest
  const handleDeleteGuest = (id: string) => {
    const guest = data.guests.find(g => g.id === id);
    setData(prev => {
      let newGroups = prev.groups;
      if (guest?.groupId) {
        newGroups = prev.groups.map(g =>
          g.id === guest.groupId ? { ...g, memberIds: g.memberIds.filter(mid => mid !== id) } : g
        ).filter(g => g.memberIds.length > 0);
      }
      return { ...prev, guests: prev.guests.filter(g => g.id !== id), groups: newGroups };
    });
  };

  // Delete group
  const handleDeleteGroup = (groupId: string) => {
    setData(prev => ({
      ...prev,
      guests: prev.guests.filter(g => g.groupId !== groupId),
      groups: prev.groups.filter(g => g.id !== groupId)
    }));
  };

  // Edit group name
  const startEditingGroup = (groupId: string, currentName: string) => {
    setEditingGroupId(groupId);
    setEditGroupName(currentName);
  };

  const saveGroupName = () => {
    if (!editingGroupId || !editGroupName.trim()) { setEditingGroupId(null); return; }
    setData(prev => ({
      ...prev, groups: prev.groups.map(g => g.id === editingGroupId ? { ...g, name: autoCapitalize(editGroupName.trim()) } : g)
    }));
    setEditingGroupId(null);
  };

  // Add member to existing family
  const handleAddMemberToFamily = (groupId: string) => {
    const existingEmptyMember = data.guests.find(g => g.groupId === groupId && g.name.trim() === '');
    if (existingEmptyMember) {
      setExpandedGroups(prev => new Set([...prev, groupId]));
      setEditingGuest(existingEmptyMember);
      return;
    }
    const firstMember = data.guests.find(g => g.groupId === groupId);
    const newGuest = createGuest(
      '', firstMember?.side || 'groom', 'male', 'adult',
      firstMember?.role || 'vip', firstMember?.invitedTo || enabledEvents.map(e => e.id), groupId
    );
    setExpandedGroups(prev => new Set([...prev, groupId]));
    setData(prev => ({
      ...prev,
      guests: [...prev.guests, newGuest],
      groups: prev.groups.map(g => g.id === groupId ? { ...g, memberIds: [...g.memberIds, newGuest.id] } : g)
    }));
    setEditingGuest(newGuest);
  };

  // Update guest
  const handleUpdateGuest = (updatedGuest: Guest) => {
    if (!updatedGuest.name.trim()) return;
    const capitalized = { ...updatedGuest, name: autoCapitalize(updatedGuest.name.trim()) };
    setData(prev => ({ ...prev, guests: prev.guests.map(g => g.id === capitalized.id ? capitalized : g) }));
    setEditingGuest(null);
  };

  // Cancel editing
  const handleCancelEdit = (guestId: string) => {
    const guest = data.guests.find(g => g.id === guestId);
    if (guest && !guest.name.trim()) {
      setData(prev => {
        let newGroups = prev.groups;
        if (guest.groupId) {
          newGroups = prev.groups.map(g =>
            g.id === guest.groupId ? { ...g, memberIds: g.memberIds.filter(mid => mid !== guestId) } : g
          ).filter(g => g.memberIds.length > 0);
        }
        return { ...prev, guests: prev.guests.filter(g => g.id !== guestId), groups: newGroups };
      });
    }
    setEditingGuest(null);
  };

  // Cycle RSVP status
  const handleCycleRsvp = useCallback((guestId: string) => {
    setData(prev => ({
      ...prev,
      guests: prev.guests.map(g => {
        if (g.id !== guestId) return g;
        const next: RsvpStatus = g.rsvpStatus === 'pending' ? 'confirmed' : g.rsvpStatus === 'confirmed' ? 'declined' : 'pending';
        return { ...g, rsvpStatus: next };
      })
    }));
  }, []);

  // Move guest between groups
  const handleMoveGuest = useCallback((guestId: string, targetGroupId: string | null) => {
    setData(prev => {
      const guest = prev.guests.find(g => g.id === guestId);
      if (!guest) return prev;

      let newGroups = prev.groups.map(g => ({
        ...g, memberIds: g.memberIds.filter(mid => mid !== guestId)
      }));

      if (targetGroupId) {
        newGroups = newGroups.map(g =>
          g.id === targetGroupId ? { ...g, memberIds: [...g.memberIds, guestId] } : g
        );
      }

      // Clean up empty groups
      newGroups = newGroups.filter(g => g.memberIds.length > 0);

      const newGuests = prev.guests.map(g =>
        g.id === guestId ? { ...g, groupId: targetGroupId || undefined } : g
      );

      return { ...prev, guests: newGuests, groups: newGroups };
    });
    setMoveMenuGuestId(null);
    setToastMessage(targetGroupId ? 'Guest moved to group' : 'Guest removed from group');
  }, []);

  // Toggle event enabled
  const toggleEventEnabled = (eventId: string) => {
    setData(prev => ({
      ...prev, events: prev.events.map(e => e.id === eventId ? { ...e, enabled: !e.enabled } : e)
    }));
  };

  // Toggle segregation mode
  const toggleSegregationMode = () => {
    setData(prev => ({ ...prev, segregationMode: !prev.segregationMode }));
  };

  // Toggle event in individual form
  const toggleIndividualEvent = (eventId: string) => {
    setIndividualForm(prev => ({
      ...prev,
      invitedTo: prev.invitedTo.includes(eventId)
        ? prev.invitedTo.filter(e => e !== eventId)
        : [...prev.invitedTo, eventId]
    }));
  };

  // Toggle event in family form
  const toggleFamilyEvent = (eventId: string) => {
    setFamilyForm(prev => ({
      ...prev,
      invitedTo: prev.invitedTo.includes(eventId)
        ? prev.invitedTo.filter(e => e !== eventId)
        : [...prev.invitedTo, eventId]
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); if (addMode === 'individual') handleAddIndividual(); }
  };

  // Custom events
  const handleAddCustomEvent = () => {
    const name = newCustomEventName.trim();
    if (!name) return;
    const id = `custom-${generateId()}`;
    const newEvent: WeddingEventConfig = { id, name, icon: newCustomEventIcon, enabled: true, isCustom: true };
    setData(prev => ({ ...prev, events: [...prev.events, newEvent] }));
    setNewCustomEventName('');
    setNewCustomEventIcon('🎉');
  };

  const handleDeleteCustomEvent = (eventId: string) => {
    setData(prev => ({
      ...prev,
      events: prev.events.filter(e => e.id !== eventId),
      guests: prev.guests.map(g => ({ ...g, invitedTo: g.invitedTo.filter(e => e !== eventId) }))
    }));
  };

  // Table number for group
  const handleGroupTableNumber = (groupId: string, tableNumber: string) => {
    setData(prev => ({
      ...prev, groups: prev.groups.map(g => g.id === groupId ? { ...g, tableNumber } : g)
    }));
  };

  // CSV Import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setImportPreview(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const rows = parseCSV(text);
        if (rows.length < 2) { setImportError('CSV file appears to be empty or has no data rows.'); return; }

        const headers = rows[0].map(h => h.toLowerCase().replace(/[^a-z]/g, ''));
        const nameIdx = headers.findIndex(h => h.includes('name'));
        const groupIdx = headers.findIndex(h => h.includes('group') || h.includes('family'));
        const sideIdx = headers.findIndex(h => h.includes('side'));
        const genderIdx = headers.findIndex(h => h.includes('gender'));
        const typeIdx = headers.findIndex(h => h.includes('type'));
        const roleIdx = headers.findIndex(h => h.includes('role'));
        const phoneIdx = headers.findIndex(h => h.includes('phone'));

        if (nameIdx === -1) { setImportError('CSV must have a "Name" column.'); return; }

        const previewGuests: Partial<Guest>[] = [];
        const groupNames = new Set<string>();

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const name = row[nameIdx]?.trim();
          if (!name) continue;

          const groupName = groupIdx >= 0 ? row[groupIdx]?.trim() : '';
          if (groupName) groupNames.add(groupName);

          const side = sideIdx >= 0 ? (row[sideIdx]?.trim().toLowerCase() as GuestSide) : 'groom';
          const gender = genderIdx >= 0 ? (row[genderIdx]?.trim().toLowerCase() as GuestGender) : 'male';
          const gType = typeIdx >= 0 ? (row[typeIdx]?.trim().toLowerCase() as GuestType) : 'adult';
          const role = roleIdx >= 0 ? (row[roleIdx]?.trim().toLowerCase() as GuestRole) : 'guest';
          const phone = phoneIdx >= 0 ? row[phoneIdx]?.trim() : undefined;

          previewGuests.push({ name, side: ['groom', 'bride', 'joint'].includes(side) ? side : 'groom', gender: ['male', 'female'].includes(gender) ? gender : 'male', type: ['adult', 'child'].includes(gType) ? gType : 'adult', role, phone, groupId: groupName || undefined });
        }

        setImportPreview({ guests: previewGuests, groups: Array.from(groupNames) });
      } catch {
        setImportError('Failed to parse CSV file. Please check the format.');
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  const handleConfirmImport = () => {
    if (!importPreview) return;

    const groupMap = new Map<string, string>(); // groupName -> groupId
    const newGroups: GuestGroup[] = [];
    const newGuests: Guest[] = [];

    importPreview.groups.forEach(name => {
      const id = generateId();
      groupMap.set(name, id);
      newGroups.push({ id, name, memberIds: [], createdAt: new Date().toISOString() });
    });

    importPreview.guests.forEach(pg => {
      const groupName = pg.groupId as string | undefined;
      const groupId = groupName ? groupMap.get(groupName) : undefined;
      const guest = createGuest(
        pg.name!, pg.side || 'groom', pg.gender || 'male', pg.type || 'adult',
        pg.role || 'guest', enabledEvents.map(e => e.id), groupId
      );
      if (pg.phone) guest.phone = pg.phone;
      newGuests.push(guest);
      if (groupId) {
        const group = newGroups.find(g => g.id === groupId);
        if (group) group.memberIds.push(guest.id);
      }
    });

    setData(prev => ({
      ...prev,
      guests: [...prev.guests, ...newGuests],
      groups: [...prev.groups, ...newGroups],
    }));

    setShowImportModal(false);
    setImportPreview(null);
    setImportError(null);
    setToastMessage(`Imported ${newGuests.length} guests${newGroups.length > 0 ? ` in ${newGroups.length} groups` : ''}`);
  };

  // CSV Template Download
  const handleDownloadTemplate = () => {
    const csv = generateCSVTemplate();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'guest-list-template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  // PDF Export
  const handleExportPDF = async (mode: 'all' | 'men' | 'women' | 'tables') => {
    try {
      const jsPDF = (await import('jspdf')).default;
      await import('jspdf-autotable');

      const doc = new jsPDF();
      const title = mode === 'men' ? 'Guest List - Male' : mode === 'women' ? 'Guest List - Female' : mode === 'tables' ? 'Guest List - By Table' : 'Guest List';

      doc.setFontSize(18);
      doc.text(title, 14, 20);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated on ${new Date().toLocaleDateString()} | Total: ${data.guests.length} guests`, 14, 28);
      doc.setTextColor(0);

      let guests = [...data.guests];
      if (mode === 'men') guests = guests.filter(g => g.gender === 'male');
      if (mode === 'women') guests = guests.filter(g => g.gender === 'female');

      if (mode === 'tables') {
        // Group by table number
        const byTable = new Map<string, Guest[]>();
        guests.forEach(g => {
          const table = g.tableNumber || data.groups.find(gr => gr.id === g.groupId)?.tableNumber || 'Unassigned';
          if (!byTable.has(table)) byTable.set(table, []);
          byTable.get(table)!.push(g);
        });

        let startY = 35;
        byTable.forEach((tableGuests, tableName) => {
          doc.setFontSize(12);
          doc.text(`Table: ${tableName}`, 14, startY);
          startY += 5;

          (doc as any).autoTable({
            head: [['#', 'Name', 'Group', 'Side', 'RSVP']],
            body: tableGuests.map((g, i) => {
              const group = data.groups.find(gr => gr.id === g.groupId);
              return [i + 1, g.name, group?.name || '-', g.side === 'groom' ? "Groom's" : g.side === 'bride' ? "Bride's" : 'Both', g.rsvpStatus.charAt(0).toUpperCase() + g.rsvpStatus.slice(1)];
            }),
            startY,
            theme: 'grid',
            headStyles: { fillColor: [30, 41, 59], fontSize: 8 },
            styles: { fontSize: 8 },
            margin: { left: 14 },
          });
          startY = (doc as any).lastAutoTable.finalY + 10;
          if (startY > 260) { doc.addPage(); startY = 20; }
        });
      } else {
        (doc as any).autoTable({
          head: [['#', 'Name', 'Group', 'Side', 'Table', 'RSVP', 'Role']],
          body: guests.map((g, i) => {
            const group = data.groups.find(gr => gr.id === g.groupId);
            return [
              i + 1, g.name, group?.name || '-',
              g.side === 'groom' ? "Groom's" : g.side === 'bride' ? "Bride's" : 'Both',
              g.tableNumber || group?.tableNumber || '-',
              g.rsvpStatus.charAt(0).toUpperCase() + g.rsvpStatus.slice(1),
              GUEST_ROLES.find(r => r.value === g.role)?.label || 'Guest',
            ];
          }),
          startY: 35,
          theme: 'grid',
          headStyles: { fillColor: [30, 41, 59], fontSize: 8 },
          styles: { fontSize: 8 },
        });
      }

      doc.save(`guest-list${mode !== 'all' ? `-${mode}` : ''}.pdf`);
      setShowExportMenu(false);
      setToastMessage('PDF exported successfully');
    } catch (err) {
      console.error('PDF export error:', err);
      setToastMessage('Failed to export PDF');
    }
  };

  // Clipboard copy
  const handleCopyToClipboard = async () => {
    const text = formatGuestListForClipboard(data.guests, data.groups, enabledEvents);
    try {
      await navigator.clipboard.writeText(text);
      setClipboardCopied(true);
      setToastMessage('Guest list copied to clipboard');
      setTimeout(() => setClipboardCopied(false), 2000);
    } catch {
      setToastMessage('Failed to copy to clipboard');
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-3xl font-serif font-bold text-slate-800 dark:text-white mb-2">
          Guest Manager
        </h2>
        <p className="text-slate-600 dark:text-slate-400 italic">
          Manage your guest list across multiple events
        </p>
      </div>

      {/* Stats Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-3 sm:p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            {activeFilter === 'all' ? 'All Guests' : enabledEvents.find(e => e.id === activeFilter)?.name + ' Guests'}
          </h3>
          {/* Segregation toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 hidden sm:inline">Segregation</span>
            <div className={`relative w-9 h-5 rounded-full transition-colors ${
              data.segregationMode ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
            }`}>
              <input type="checkbox" checked={data.segregationMode} onChange={toggleSegregationMode} className="sr-only" />
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                data.segregationMode ? 'translate-x-4' : 'translate-x-0.5'
              }`} />
            </div>
          </label>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-800 dark:text-white">{stats.total}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-800 dark:text-white">
              {stats.adults}<span className="text-sm text-slate-400">/{stats.children}</span>
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Adults/Kids</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-0.5">
              <span className="text-lg font-bold text-teal-600 dark:text-teal-400">{stats.groomSide}</span>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span className="text-lg font-bold text-rose-600 dark:text-rose-400">{stats.brideSide}</span>
              {stats.jointSide > 0 && (
                <>
                  <span className="text-slate-300 dark:text-slate-600">/</span>
                  <span className="text-lg font-bold text-violet-600 dark:text-violet-400">{stats.jointSide}</span>
                </>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {stats.jointSide > 0 ? 'Groom/Bride/Joint' : 'Groom/Bride'}
            </p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-0.5">
              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{stats.males}</span>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span className="text-lg font-bold text-pink-600 dark:text-pink-400">{stats.females}</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Male/Female</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400" title="Confirmed">{stats.confirmed}<span className="text-[10px] font-medium text-emerald-500/70 ml-0.5">&#10003;</span></span>
              <span className="text-lg font-bold text-slate-400" title="Pending">{stats.pending}<span className="text-[10px] font-medium text-slate-400/70 ml-0.5">?</span></span>
              {stats.declined > 0 && (
                <span className="text-lg font-bold text-red-500" title="Declined">{stats.declined}<span className="text-[10px] font-medium text-red-400/70 ml-0.5">&#10007;</span></span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">RSVP</p>
          </div>
        </div>
      </div>

      {/* Segregation Tabs */}
      {data.segregationMode && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
            Filter by gender
          </p>
          <div className="inline-flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
            {([
              { key: 'all' as const, label: 'All', count: stats.total },
              { key: 'men' as const, label: 'Male', count: stats.males },
              { key: 'women' as const, label: 'Female', count: stats.females },
            ]).map(tab => (
              <button
                key={tab.key}
                onClick={() => setSegregationTab(tab.key)}
                className={`px-4 py-2 font-semibold text-xs transition-all ${
                  segregationTab === tab.key
                    ? tab.key === 'men' ? 'bg-blue-600 text-white' : tab.key === 'women' ? 'bg-pink-600 text-white' : 'bg-slate-800 dark:bg-white text-white dark:text-slate-800'
                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filter by Event */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Filter by event
          </p>
          <button
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            <SettingsIcon className="w-3 h-3" />
            Manage
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto md:overflow-visible md:flex-wrap pb-2 -mx-4 px-4 md:mx-0 md:px-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <button
            onClick={() => setActiveFilter('all')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg font-semibold text-xs transition-all whitespace-nowrap ${
              activeFilter === 'all'
                ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-800'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            All ({data.guests.length})
          </button>
          {enabledEvents.map(event => {
            const count = data.guests.filter(g => g.invitedTo.includes(event.id)).length;
            return (
              <button
                key={event.id}
                onClick={() => setActiveFilter(event.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg font-semibold text-xs transition-all whitespace-nowrap ${
                  activeFilter === event.id
                    ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-800'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {event.name} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Buttons Row - Import/Export/Copy */}
      <div className="flex items-center justify-end gap-2 mb-3">
        <button
          onClick={() => setShowImportModal(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
          title="Import CSV"
        >
          <UploadIcon className="w-3.5 h-3.5" />
          Import
        </button>
        <div className="relative" ref={exportMenuRef}>
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
            title="Export PDF"
          >
            <FileTextIcon className="w-3.5 h-3.5" />
            Export
            <ChevronDown className="w-3 h-3" />
          </button>
          {showExportMenu && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 z-30 py-1">
              {[
                { key: 'all' as const, label: 'All Guests' },
                { key: 'men' as const, label: 'Male Only' },
                { key: 'women' as const, label: 'Female Only' },
                { key: 'tables' as const, label: 'By Table' },
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => handleExportPDF(opt.key)}
                  className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={handleCopyToClipboard}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
          title="Copy guest list to clipboard"
        >
          <ClipboardIcon className="w-3.5 h-3.5" />
          {clipboardCopied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Add Guest Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-3 sm:p-4 mb-6">
        {/* Mode Toggle */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">Add:</span>
          <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600">
            <button
              onClick={() => setAddMode('individual')}
              className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold transition-colors ${
                addMode === 'individual' ? 'bg-blue-600 text-white' : 'bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400'
              }`}
            >
              👤 Individual
            </button>
            <button
              onClick={() => setAddMode('family')}
              className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold transition-colors ${
                addMode === 'family' ? 'bg-blue-600 text-white' : 'bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400'
              }`}
            >
              👥 Group
            </button>
          </div>
        </div>

        {/* Individual Form */}
        {addMode === 'individual' && (
          <div>
            <div className="flex gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Name <span className="text-red-400">*</span></p>
                <input
                  type="text"
                  value={individualForm.name}
                  onChange={(e) => setIndividualForm(prev => ({ ...prev, name: e.target.value }))}
                  onKeyDown={handleKeyDown}
                  placeholder="Guest name..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 focus:border-blue-400 rounded-lg transition-all outline-none font-medium text-sm text-slate-800 dark:text-white placeholder:text-slate-400"
                />
              </div>
              <div className="w-36 sm:w-44">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Role</p>
                <select
                  value={individualForm.role}
                  onChange={(e) => setIndividualForm(prev => ({ ...prev, role: e.target.value as GuestRole }))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-lg outline-none font-medium text-slate-800 dark:text-white text-sm appearance-none"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.25em 1.25em', paddingRight: '2rem' }}
                >
                  {GUEST_ROLES.map(role => (
                    <option key={role.value} value={role.value}>{role.icon} {role.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-x-4 gap-y-3 mb-4">
              {/* Side */}
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Side</p>
                <div className="inline-flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600">
                  {(['groom', 'bride', 'joint'] as const).map(side => (
                    <button
                      key={side}
                      onClick={() => setIndividualForm(prev => ({ ...prev, side }))}
                      className={`px-3 py-2 text-xs font-semibold transition-colors ${
                        individualForm.side === side
                          ? side === 'groom' ? 'bg-teal-500 text-white' : side === 'bride' ? 'bg-rose-500 text-white' : 'bg-violet-500 text-white'
                          : 'bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {side === 'groom' ? 'Groom' : side === 'bride' ? 'Bride' : 'Both'}
                    </button>
                  ))}
                </div>
              </div>
              {/* Gender */}
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Gender</p>
                <div className="inline-flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600">
                  {(['male', 'female'] as const).map(gender => (
                    <button
                      key={gender}
                      onClick={() => setIndividualForm(prev => ({ ...prev, gender }))}
                      className={`px-3 py-2 text-xs font-semibold transition-colors ${
                        individualForm.gender === gender
                          ? gender === 'male' ? 'bg-blue-500 text-white' : 'bg-pink-500 text-white'
                          : 'bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {gender === 'male' ? 'Male' : 'Female'}
                    </button>
                  ))}
                </div>
              </div>
              {/* Type */}
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Type</p>
                <div className="inline-flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600">
                  {(['adult', 'child'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setIndividualForm(prev => ({ ...prev, type }))}
                      className={`px-3 py-2 text-xs font-semibold transition-colors ${
                        individualForm.type === type
                          ? type === 'adult' ? 'bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-800' : 'bg-amber-500 text-white'
                          : 'bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {type === 'adult' ? 'Adult' : 'Child'}
                    </button>
                  ))}
                </div>
              </div>
              {/* Table */}
              <div className="w-20">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Table #</p>
                <input type="text" value={individualForm.tableNumber}
                  onChange={(e) => setIndividualForm(prev => ({ ...prev, tableNumber: e.target.value }))}
                  placeholder="—"
                  className="w-full px-2 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-medium text-slate-800 dark:text-white outline-none focus:border-blue-400 text-center placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Events */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Invite to</p>
                <button
                  onClick={() => {
                    const allSelected = individualForm.invitedTo.length === enabledEvents.length;
                    setIndividualForm(prev => ({ ...prev, invitedTo: allSelected ? [] : enabledEvents.map(e => e.id) }));
                  }}
                  className="text-[10px] font-medium text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  {individualForm.invitedTo.length === enabledEvents.length ? 'Clear all' : 'Select all'}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {enabledEvents.map(event => (
                  <button
                    key={event.id}
                    onClick={() => toggleIndividualEvent(event.id)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                      individualForm.invitedTo.includes(event.id)
                        ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-transparent'
                    }`}
                  >
                    {event.name}
                    {individualForm.invitedTo.includes(event.id) && <Check className="w-3 h-3" />}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleAddIndividual}
              disabled={!individualForm.name.trim() || individualForm.invitedTo.length === 0}
              className="w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:dark:bg-slate-600 text-white font-bold text-sm rounded-xl transition-all disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Add Guest
            </button>
            <p className="text-center text-[10px] text-slate-400 dark:text-slate-500 mt-2 italic">
              Phone, notes & RSVP status can be added by editing a guest after creation
            </p>
          </div>
        )}

        {/* Group Form */}
        {addMode === 'family' && (
          <div>
            <div className="mb-3">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Group name</p>
              <input
                type="text"
                value={familyForm.familyName}
                onChange={(e) => setFamilyForm(prev => ({ ...prev, familyName: e.target.value }))}
                placeholder="e.g., The Khan Family, Work Colleagues"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 focus:border-blue-400 rounded-lg transition-all outline-none font-medium text-sm text-slate-800 dark:text-white placeholder:text-slate-400"
              />
            </div>
            <div className="flex flex-wrap items-end gap-x-4 gap-y-3 mb-3">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Side</p>
                <div className="inline-flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600">
                  {(['groom', 'bride', 'joint'] as const).map(side => (
                    <button
                      key={side}
                      onClick={() => setFamilyForm(prev => ({ ...prev, side }))}
                      className={`px-3 py-2 text-xs font-semibold transition-colors ${
                        familyForm.side === side
                          ? side === 'groom' ? 'bg-teal-500 text-white' : side === 'bride' ? 'bg-rose-500 text-white' : 'bg-violet-500 text-white'
                          : 'bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {side === 'groom' ? 'Groom' : side === 'bride' ? 'Bride' : 'Both'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="w-20">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Table #</p>
                <input type="text" value={familyForm.tableNumber}
                  onChange={(e) => setFamilyForm(prev => ({ ...prev, tableNumber: e.target.value }))}
                  placeholder="—"
                  className="w-full px-2 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-medium text-slate-800 dark:text-white outline-none focus:border-blue-400 text-center placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Invite to</p>
                <button
                  onClick={() => {
                    const allSelected = familyForm.invitedTo.length === enabledEvents.length;
                    setFamilyForm(prev => ({ ...prev, invitedTo: allSelected ? [] : enabledEvents.map(e => e.id) }));
                  }}
                  className="text-[10px] font-medium text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  {familyForm.invitedTo.length === enabledEvents.length ? 'Clear all' : 'Select all'}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {enabledEvents.map(event => (
                  <button
                    key={event.id}
                    onClick={() => toggleFamilyEvent(event.id)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                      familyForm.invitedTo.includes(event.id)
                        ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-transparent'
                    }`}
                  >
                    {event.name}
                    {familyForm.invitedTo.includes(event.id) && <Check className="w-3 h-3" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Members ({familyForm.members.length})</p>
                <button onClick={addFamilyMember}
                  className="flex items-center gap-1 text-[10px] font-medium text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                  <Plus className="w-3 h-3" /> Add member
                </button>
              </div>
              <div ref={membersListRef} className={`space-y-2 ${familyForm.members.length > 2 ? 'max-h-56 overflow-y-auto' : ''}`} style={familyForm.members.length > 2 ? { scrollbarWidth: 'thin' } : {}}>
                {familyForm.members.map((member, index) => (
                  <div key={index} className="p-2 bg-slate-50 dark:bg-slate-900/30 rounded-lg">
                    {/* Row 1: Number + Name + Role + (Gender+Type on md+) + X */}
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 w-4 text-center flex-shrink-0">{index + 1}</span>
                      <input
                        type="text"
                        value={member.name}
                        onChange={(e) => updateFamilyMember(index, 'name', e.target.value)}
                        placeholder={index === 0 ? "e.g., Mr. Khan" : index === 1 ? "e.g., Mrs. Khan" : `Member ${index + 1}`}
                        className="flex-1 min-w-0 px-2 py-1.5 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-md outline-none text-xs font-medium text-slate-800 dark:text-white placeholder:text-slate-400 focus:border-blue-400"
                      />
                      <select
                        value={member.role}
                        onChange={(e) => updateFamilyMember(index, 'role', e.target.value)}
                        className="w-32 sm:w-32 px-1.5 py-1.5 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-md outline-none text-[11px] font-medium text-slate-800 dark:text-white flex-shrink-0 appearance-none"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.35rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.25em 1.25em', paddingRight: '1.6rem' }}
                      >
                        {GUEST_ROLES.map(role => (
                          <option key={role.value} value={role.value}>{role.icon} {role.shortLabel}</option>
                        ))}
                      </select>
                      {/* Gender+Type: visible on md+ only (inline with row 1) */}
                      <div className="hidden md:flex items-center gap-3 flex-shrink-0">
                        <div className="inline-flex rounded-md overflow-hidden border border-slate-200 dark:border-slate-600">
                          {(['male', 'female'] as const).map(gender => (
                            <button key={gender} onClick={() => updateFamilyMember(index, 'gender', gender)}
                              className={`px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                                member.gender === gender
                                  ? gender === 'male' ? 'bg-blue-500 text-white' : 'bg-pink-500 text-white'
                                  : 'bg-white dark:bg-slate-900/50 text-slate-500 dark:text-slate-400'
                              }`}>
                              {gender === 'male' ? 'Male' : 'Female'}
                            </button>
                          ))}
                        </div>
                        <div className="inline-flex rounded-md overflow-hidden border border-slate-200 dark:border-slate-600">
                          {(['adult', 'child'] as const).map(type => (
                            <button key={type} onClick={() => updateFamilyMember(index, 'type', type)}
                              className={`px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                                member.type === type
                                  ? type === 'adult' ? 'bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-800' : 'bg-amber-500 text-white'
                                  : 'bg-white dark:bg-slate-900/50 text-slate-500 dark:text-slate-400'
                              }`}>
                              {type === 'adult' ? 'Adult' : 'Child'}
                            </button>
                          ))}
                        </div>
                      </div>
                      {familyForm.members.length > 1 ? (
                        <button onClick={() => removeFamilyMember(index)}
                          className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors flex-shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      ) : <span className="w-[26px] flex-shrink-0" />}
                    </div>
                    {/* Row 2: Gender+Type on smaller screens, aligned with name field */}
                    <div className="flex md:hidden items-center gap-3 mt-2 ml-[28px]">
                      <div className="inline-flex rounded-md overflow-hidden border border-slate-200 dark:border-slate-600">
                        {(['male', 'female'] as const).map(gender => (
                          <button key={gender} onClick={() => updateFamilyMember(index, 'gender', gender)}
                            className={`px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                              member.gender === gender
                                ? gender === 'male' ? 'bg-blue-500 text-white' : 'bg-pink-500 text-white'
                                : 'bg-white dark:bg-slate-900/50 text-slate-500 dark:text-slate-400'
                            }`}>
                            {gender === 'male' ? 'Male' : 'Female'}
                          </button>
                        ))}
                      </div>
                      <div className="inline-flex rounded-md overflow-hidden border border-slate-200 dark:border-slate-600">
                        {(['adult', 'child'] as const).map(type => (
                          <button key={type} onClick={() => updateFamilyMember(index, 'type', type)}
                            className={`px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                              member.type === type
                                ? type === 'adult' ? 'bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-800' : 'bg-amber-500 text-white'
                                : 'bg-white dark:bg-slate-900/50 text-slate-500 dark:text-slate-400'
                            }`}>
                            {type === 'adult' ? 'Adult' : 'Child'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={handleAddFamily}
              disabled={familyForm.members.every(m => !m.name.trim()) || familyForm.invitedTo.length === 0}
              className="w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:dark:bg-slate-600 text-white font-bold text-sm rounded-xl transition-all disabled:cursor-not-allowed">
              <Plus className="w-4 h-4" /> Add Group
            </button>
          </div>
        )}
      </div>

      {/* Guest List */}
      <div className="space-y-3">
        {filteredGuests.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              {data.guests.length === 0
                ? 'No guests yet. Start adding your guest list above!'
                : `No guests match the current filters`
              }
            </p>
          </div>
        ) : (
          <>
            {/* Grouped guests (Families) */}
            {organizedGuests.grouped.map(({ group, members }) => {
              const isExpanded = expandedGroups.has(group.id);
              const isEditingThisGroup = editingGroupId === group.id;
              return (
                <div key={group.id} className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-violet-200 dark:border-violet-800/50 overflow-hidden">
                  <div
                    onClick={() => !isEditingThisGroup && toggleGroupExpanded(group.id)}
                    className={`w-full px-4 py-3 flex items-center justify-between bg-violet-50/50 dark:bg-violet-900/10 transition-colors ${!isEditingThisGroup ? 'hover:bg-violet-100/50 dark:hover:bg-violet-900/20 cursor-pointer' : ''}`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-violet-200 dark:bg-violet-800/50 flex items-center justify-center text-lg flex-shrink-0">
                        👨‍👩‍👧
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        {isEditingThisGroup ? (
                          <div className="flex items-center gap-2">
                            <input type="text" value={editGroupName}
                              onChange={(e) => setEditGroupName(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') saveGroupName(); if (e.key === 'Escape') setEditingGroupId(null); }}
                              onClick={(e) => e.stopPropagation()} autoFocus
                              className="flex-1 px-2 py-1 bg-white dark:bg-slate-900/50 border-2 border-blue-400 rounded-lg outline-none font-bold text-slate-800 dark:text-white text-sm"
                            />
                            <button onClick={(e) => { e.stopPropagation(); saveGroupName(); }}
                              className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"><Check className="w-4 h-4" /></button>
                            <button onClick={(e) => { e.stopPropagation(); setEditingGroupId(null); }}
                              className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><X className="w-4 h-4" /></button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-slate-800 dark:text-white">{group.name}</p>
                              {isExpanded ? (
                                <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-1.5 py-0.5 focus-within:border-blue-400">
                                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Table</span>
                                  <input
                                    type="text" value={group.tableNumber || ''} placeholder="#"
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => handleGroupTableNumber(group.id, e.target.value)}
                                    className="w-8 bg-transparent text-xs font-medium text-slate-600 dark:text-slate-300 outline-none text-center placeholder:text-slate-400"
                                  />
                                </div>
                              ) : group.tableNumber ? (
                                <span className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded font-medium">
                                  Table {group.tableNumber}
                                </span>
                              ) : null}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {members.length} members • {members.filter(m => m.type === 'adult').length} adults, {members.filter(m => m.type === 'child').length} kids
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                    {!isEditingThisGroup && (
                      <div className="flex items-center gap-1">
                        <button onClick={(e) => { e.stopPropagation(); startEditingGroup(group.id, group.name); }}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title="Edit group name">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ type: 'group', id: group.id, name: group.name, memberCount: members.length }); }}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Delete group">
                          <Trash className="w-4 h-4" />
                        </button>
                        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    )}
                  </div>

                  {isExpanded && (
                    <>
                      <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {members.map(guest => (
                          <GuestRow
                            key={guest.id} guest={guest} enabledEvents={enabledEvents} groups={data.groups}
                            onEdit={() => setEditingGuest(guest)}
                            onDelete={() => setDeleteConfirm({ type: 'guest', id: guest.id, name: guest.name })}
                            isEditing={editingGuest?.id === guest.id} editingGuest={editingGuest}
                            onSave={handleUpdateGuest} onCancelEdit={() => handleCancelEdit(guest.id)}
                            onCycleRsvp={handleCycleRsvp}
                            moveMenuGuestId={moveMenuGuestId} setMoveMenuGuestId={setMoveMenuGuestId}
                            onMoveGuest={handleMoveGuest} moveMenuRef={moveMenuRef}
                          />
                        ))}
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handleAddMemberToFamily(group.id); }}
                        className="relative z-10 w-full py-2.5 flex items-center justify-center gap-2 text-sm font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 border-t border-dashed border-violet-200 dark:border-violet-800/50 transition-colors cursor-pointer">
                        <Plus className="w-4 h-4" /> Add new member
                      </button>
                    </>
                  )}
                </div>
              );
            })}

            {/* Ungrouped guests */}
            {organizedGuests.ungrouped.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {organizedGuests.ungrouped.map(guest => (
                    <GuestRow
                      key={guest.id} guest={guest} enabledEvents={enabledEvents} groups={data.groups}
                      onEdit={() => setEditingGuest(guest)}
                      onDelete={() => setDeleteConfirm({ type: 'guest', id: guest.id, name: guest.name })}
                      isEditing={editingGuest?.id === guest.id} editingGuest={editingGuest}
                      onSave={handleUpdateGuest} onCancelEdit={() => handleCancelEdit(guest.id)}
                      onCycleRsvp={handleCycleRsvp}
                      moveMenuGuestId={moveMenuGuestId} setMoveMenuGuestId={setMoveMenuGuestId}
                      onMoveGuest={handleMoveGuest} moveMenuRef={moveMenuRef}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowSettingsModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Settings</h3>
              <button onClick={() => setShowSettingsModal(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Segregation Mode */}
            <div className="mb-6">
              <label className="flex items-center justify-between cursor-pointer p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-white">Segregation Mode</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">View male/female counts for segregated seating</p>
                </div>
                <div className={`relative w-11 h-6 rounded-full transition-colors ${
                  data.segregationMode ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-500'
                }`}>
                  <input type="checkbox" checked={data.segregationMode} onChange={toggleSegregationMode} className="sr-only" />
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    data.segregationMode ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </div>
              </label>
            </div>

            {/* Event Configuration */}
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Events to track</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Enable the events you want to track guest invitations for
              </p>

              {ALL_EVENT_PRESETS.map(category => {
                const categoryEvents = data.events.filter(de => category.events.some(pe => pe.id === de.id));
                if (categoryEvents.length === 0) return null;
                return (
                  <div key={category.category} className="mb-4">
                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2">{category.category}</p>
                    <div className="space-y-1.5">
                      {categoryEvents.map(event => (
                        <button key={event.id} onClick={() => toggleEventEnabled(event.id)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                            event.enabled
                              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-400 text-blue-700 dark:text-blue-300'
                              : 'bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                          }`}>
                          <span className="text-xl">{event.icon}</span>
                          <span className="flex-1 font-medium">{event.name}</span>
                          {event.enabled && <Check className="w-5 h-5" />}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Custom Events */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2">Custom Events</p>
                <div className="space-y-1.5">
                  {data.events.filter(e => e.isCustom).map(event => (
                    <div key={event.id} className="flex items-center gap-2">
                      <button onClick={() => toggleEventEnabled(event.id)}
                        className={`flex-1 flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                          event.enabled
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-400 text-blue-700 dark:text-blue-300'
                            : 'bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                        }`}>
                        <span className="text-xl">{event.icon}</span>
                        <span className="flex-1 font-medium">{event.name}</span>
                        {event.enabled && <Check className="w-5 h-5" />}
                      </button>
                      <button onClick={() => handleDeleteCustomEvent(event.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                {/* Add custom event */}
                <div className="flex items-center gap-2 mt-3">
                  <select value={newCustomEventIcon} onChange={(e) => setNewCustomEventIcon(e.target.value)}
                    className="w-14 px-1 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-lg text-center text-lg outline-none">
                    {['🎉', '🎊', '💐', '🎶', '🎭', '🌙', '☪️', '🕌', '🎈', '🍰', '💒', '🚗'].map(icon => (
                      <option key={icon} value={icon}>{icon}</option>
                    ))}
                  </select>
                  <input type="text" value={newCustomEventName} onChange={(e) => setNewCustomEventName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddCustomEvent(); }}
                    placeholder="Event name..."
                    className="flex-1 px-3 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-800 dark:text-white placeholder:text-slate-400 outline-none focus:border-blue-400"
                  />
                  <button onClick={handleAddCustomEvent} disabled={!newCustomEventName.trim()}
                    className="px-3 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white font-semibold text-sm rounded-lg transition-colors disabled:cursor-not-allowed">
                    Add
                  </button>
                </div>
              </div>
            </div>

            <button onClick={() => setShowSettingsModal(false)}
              className="w-full mt-4 py-3 bg-slate-800 dark:bg-white text-white dark:text-slate-800 font-bold rounded-xl hover:opacity-90 transition-opacity">
              Done
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Trash className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Delete {deleteConfirm.type === 'group' ? 'Group' : 'Guest'}?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">This cannot be undone</p>
              </div>
            </div>
            <div className="mb-6 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="font-semibold text-slate-800 dark:text-white">{deleteConfirm.name}</p>
              {deleteConfirm.type === 'group' && deleteConfirm.memberCount && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  This will delete {deleteConfirm.memberCount} member{deleteConfirm.memberCount > 1 ? 's' : ''}
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 px-4 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                Cancel
              </button>
              <button onClick={() => {
                if (deleteConfirm.type === 'group') handleDeleteGroup(deleteConfirm.id);
                else handleDeleteGuest(deleteConfirm.id);
                setDeleteConfirm(null);
              }}
                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => { setShowImportModal(false); setImportPreview(null); setImportError(null); }}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Import Guests</h3>
              <button onClick={() => { setShowImportModal(false); setImportPreview(null); setImportError(null); }}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {!importPreview ? (
              <>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Import guests from a CSV file. Download our template for the correct format.
                </p>
                <div className="space-y-3">
                  <button onClick={handleDownloadTemplate}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                    <DownloadIcon className="w-4 h-4" /> Download CSV Template
                  </button>
                  <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                  <button onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors">
                    <UploadIcon className="w-4 h-4" /> Upload CSV File
                  </button>
                </div>
                {importError && (
                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                    <p className="text-sm text-red-700 dark:text-red-400">{importError}</p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    Found {importPreview.guests.length} guests{importPreview.groups.length > 0 ? ` in ${importPreview.groups.length} groups` : ''}
                  </p>
                </div>
                <div className="max-h-60 overflow-y-auto mb-4 space-y-1">
                  {importPreview.guests.map((g, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-900/30 rounded-lg text-sm">
                      <span className="text-xs text-slate-400 w-4">{i + 1}</span>
                      <span className="font-medium text-slate-800 dark:text-white flex-1">{g.name}</span>
                      <span className="text-xs text-slate-400">{g.side}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { setImportPreview(null); setImportError(null); }}
                    className="flex-1 py-2.5 px-4 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleConfirmImport}
                    className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors">
                    Import {importPreview.guests.length} Guests
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-slate-800 dark:bg-white text-white dark:text-slate-800 font-medium text-sm rounded-xl shadow-lg animate-in slide-in-from-bottom-4 duration-200">
          {toastMessage}
        </div>
      )}
    </div>
  );
};

// ============================================================
// GUEST ROW SUB-COMPONENT
// ============================================================

interface GuestRowProps {
  guest: Guest;
  enabledEvents: WeddingEventConfig[];
  groups: GuestGroup[];
  onEdit: () => void;
  onDelete: () => void;
  isEditing: boolean;
  editingGuest: Guest | null;
  onSave: (guest: Guest) => void;
  onCancelEdit: () => void;
  onCycleRsvp: (guestId: string) => void;
  moveMenuGuestId: string | null;
  setMoveMenuGuestId: (id: string | null) => void;
  onMoveGuest: (guestId: string, targetGroupId: string | null) => void;
  moveMenuRef: React.RefObject<HTMLDivElement | null>;
}

const GuestRow: React.FC<GuestRowProps> = ({
  guest, enabledEvents, groups, onEdit, onDelete, isEditing, editingGuest,
  onSave, onCancelEdit, onCycleRsvp,
  moveMenuGuestId, setMoveMenuGuestId, onMoveGuest, moveMenuRef,
}) => {
  const [editForm, setEditForm] = useState(guest);

  useEffect(() => {
    if (isEditing && editingGuest) setEditForm(editingGuest);
  }, [isEditing, editingGuest]);

  const toggleEvent = (eventId: string) => {
    setEditForm(prev => ({
      ...prev, invitedTo: prev.invitedTo.includes(eventId) ? prev.invitedTo.filter(e => e !== eventId) : [...prev.invitedTo, eventId]
    }));
  };

  const getRoleInfo = (role: GuestRole) => GUEST_ROLES.find(r => r.value === role) || GUEST_ROLES[0];

  // RSVP badge colors
  const rsvpConfig = {
    pending: { bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-500 dark:text-slate-400', label: 'Pending' },
    confirmed: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', label: 'Confirmed' },
    declined: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: 'Declined' },
  };

  if (isEditing) {
    return (
      <div className="p-3 sm:p-4 bg-blue-50/50 dark:bg-blue-900/10 border-l-2 border-blue-400">
        <div className="space-y-3">
          {/* Name + Role */}
          <div className="flex gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Name <span className="text-red-400">*</span></p>
              <input type="text" value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Guest name..." autoFocus
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 focus:border-blue-400 rounded-lg outline-none font-medium text-sm text-slate-800 dark:text-white placeholder:text-slate-400 transition-all"
              />
            </div>
            <div className="w-36 sm:w-44">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Role</p>
              <select value={editForm.role}
                onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value as GuestRole }))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-lg outline-none font-medium text-slate-800 dark:text-white text-sm appearance-none"
                style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.25em 1.25em', paddingRight: '2rem' }}>
                {GUEST_ROLES.map(role => (
                  <option key={role.value} value={role.value}>{role.icon} {role.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Side, Gender, Type - toggle buttons */}
          <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Side</p>
              <div className="inline-flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600">
                {(['groom', 'bride', 'joint'] as const).map(side => (
                  <button key={side} onClick={() => setEditForm(prev => ({ ...prev, side }))}
                    className={`px-3 py-2 text-xs font-semibold transition-colors ${
                      editForm.side === side
                        ? side === 'groom' ? 'bg-teal-500 text-white' : side === 'bride' ? 'bg-rose-500 text-white' : 'bg-violet-500 text-white'
                        : 'bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400'
                    }`}>
                    {side === 'groom' ? 'Groom' : side === 'bride' ? 'Bride' : 'Both'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Gender</p>
              <div className="inline-flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600">
                {(['male', 'female'] as const).map(gender => (
                  <button key={gender} onClick={() => setEditForm(prev => ({ ...prev, gender }))}
                    className={`px-3 py-2 text-xs font-semibold transition-colors ${
                      editForm.gender === gender
                        ? gender === 'male' ? 'bg-blue-500 text-white' : 'bg-pink-500 text-white'
                        : 'bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400'
                    }`}>
                    {gender === 'male' ? 'Male' : 'Female'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Type</p>
              <div className="inline-flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600">
                {(['adult', 'child'] as const).map(type => (
                  <button key={type} onClick={() => setEditForm(prev => ({ ...prev, type }))}
                    className={`px-3 py-2 text-xs font-semibold transition-colors ${
                      editForm.type === type
                        ? type === 'adult' ? 'bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-800' : 'bg-amber-500 text-white'
                        : 'bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400'
                    }`}>
                    {type === 'adult' ? 'Adult' : 'Child'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* RSVP + Table */}
          <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">RSVP</p>
              <div className="inline-flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600">
                {(['pending', 'confirmed', 'declined'] as const).map(status => (
                  <button key={status} onClick={() => setEditForm(prev => ({ ...prev, rsvpStatus: status }))}
                    className={`px-3 py-2 text-xs font-semibold transition-colors ${
                      editForm.rsvpStatus === status
                        ? status === 'confirmed' ? 'bg-emerald-500 text-white' : status === 'declined' ? 'bg-red-500 text-white' : 'bg-slate-600 text-white'
                        : 'bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400'
                    }`}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="w-20">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Table #</p>
              <input type="text" value={editForm.tableNumber || ''} placeholder="—"
                onChange={(e) => setEditForm(prev => ({ ...prev, tableNumber: e.target.value || undefined }))}
                className="w-full px-2 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-medium text-slate-800 dark:text-white outline-none focus:border-blue-400 text-center placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Phone + Notes */}
          <div className="flex gap-3">
            <div className="flex-1">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Phone</p>
              <input type="tel" value={editForm.phone || ''} placeholder="Optional..."
                onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value || undefined }))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-medium text-slate-800 dark:text-white outline-none focus:border-blue-400 placeholder:text-slate-400"
              />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Notes</p>
              <input type="text" value={editForm.notes || ''} placeholder="Optional..."
                onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value || undefined }))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-medium text-slate-800 dark:text-white outline-none focus:border-blue-400 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Events */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Invite to</p>
              <button
                onClick={() => {
                  const allSelected = editForm.invitedTo.length === enabledEvents.length;
                  setEditForm(prev => ({ ...prev, invitedTo: allSelected ? [] : enabledEvents.map(e => e.id) }));
                }}
                className="text-[10px] font-medium text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              >
                {editForm.invitedTo.length === enabledEvents.length ? 'Clear all' : 'Select all'}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {enabledEvents.map(event => (
                <button key={event.id} onClick={() => toggleEvent(event.id)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                    editForm.invitedTo.includes(event.id)
                      ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-transparent'
                  }`}>
                  {event.name}
                  {editForm.invitedTo.includes(event.id) && <Check className="w-3 h-3" />}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onCancelEdit}
              className="flex items-center gap-1 px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-xs font-medium transition-colors">
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
            <button onClick={() => onSave(editForm)}
              disabled={editForm.invitedTo.length === 0 || !editForm.name.trim()}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg text-xs font-bold transition-colors">
              <Check className="w-3.5 h-3.5" /> Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  const roleInfo = getRoleInfo(guest.role);
  const invitedEvents = enabledEvents.filter(event => guest.invitedTo.includes(event.id));
  const rsvp = rsvpConfig[guest.rsvpStatus];
  const showMoveMenu = moveMenuGuestId === guest.id;
  const availableGroups = groups.filter(g => g.id !== guest.groupId);

  const RoleBadge = guest.role !== 'guest' ? (
    <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">
      {roleInfo.icon} {roleInfo.shortLabel}
    </span>
  ) : null;

  const SideBadge = (
    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap ${
      guest.side === 'groom' ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400'
        : guest.side === 'bride' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'
        : 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400'
    }`}>
      {guest.side === 'groom' ? "Groom's" : guest.side === 'bride' ? "Bride's" : 'Both'}
    </span>
  );

  return (
    <div className="relative px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
      {/* Actions */}
      <div className="absolute top-3 right-2 flex items-center">
        {/* Move button */}
        <div className="relative">
          <button onClick={() => setMoveMenuGuestId(showMoveMenu ? null : guest.id)}
            className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/30 rounded transition-colors"
            title="Move guest">
            <MoveIcon className="w-4 h-4" />
          </button>
          {showMoveMenu && (
            <div ref={moveMenuRef}
              className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 z-30 py-1 max-h-48 overflow-y-auto">
              {guest.groupId && (
                <button onClick={() => onMoveGuest(guest.id, null)}
                  className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  Remove from group
                </button>
              )}
              {availableGroups.length > 0 && guest.groupId && <div className="border-t border-slate-100 dark:border-slate-700 my-1" />}
              {availableGroups.map(group => (
                <button key={group.id} onClick={() => onMoveGuest(guest.id, group.id)}
                  className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors truncate">
                  Move to {group.name}
                </button>
              ))}
              {availableGroups.length === 0 && !guest.groupId && (
                <p className="px-3 py-2 text-xs text-slate-400 italic">No groups to move to</p>
              )}
            </div>
          )}
        </div>
        <button onClick={onEdit}
          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors" title="Edit">
          <Edit className="w-4 h-4" />
        </button>
        <button onClick={onDelete}
          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors" title="Delete">
          <Trash className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 relative ${
          guest.side === 'groom' ? 'bg-teal-100 dark:bg-teal-900/30'
            : guest.side === 'bride' ? 'bg-rose-100 dark:bg-rose-900/30'
            : 'bg-violet-100 dark:bg-violet-900/30'
        }`}>
          {guest.gender === 'male' ? '👨' : '👩'}
          {guest.type === 'child' && (
            <span className="absolute -bottom-0.5 -right-0.5 text-[10px] bg-amber-400 rounded-full w-4 h-4 flex items-center justify-center">👶</span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Desktop */}
          <div className="hidden md:flex items-center gap-2 flex-wrap pr-20">
            <span className="font-semibold text-slate-800 dark:text-white">{guest.name}</span>
            {RoleBadge}
            {SideBadge}
            {/* RSVP Badge - clickable */}
            <button onClick={() => onCycleRsvp(guest.id)} title="Click to change RSVP"
              className={`text-xs px-2 py-0.5 rounded-full font-semibold transition-colors cursor-pointer hover:opacity-80 ${rsvp.bg} ${rsvp.text}`}>
              {guest.rsvpStatus === 'confirmed' ? '✓ ' : guest.rsvpStatus === 'declined' ? '✗ ' : ''}{rsvp.label}
            </button>
            {guest.tableNumber && (
              <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded font-medium">
                Table {guest.tableNumber}
              </span>
            )}
          </div>

          {/* Mobile */}
          <div className="md:hidden">
            <p className="font-semibold text-slate-800 dark:text-white pr-20">{guest.name}</p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {RoleBadge}
              {SideBadge}
              <button onClick={() => onCycleRsvp(guest.id)} title="Click to change RSVP"
                className={`text-xs px-2 py-0.5 rounded-full font-semibold transition-colors cursor-pointer hover:opacity-80 ${rsvp.bg} ${rsvp.text}`}>
                {guest.rsvpStatus === 'confirmed' ? '✓ ' : guest.rsvpStatus === 'declined' ? '✗ ' : ''}{rsvp.label}
              </button>
              {guest.tableNumber && (
                <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded font-medium">
                  Table {guest.tableNumber}
                </span>
              )}
            </div>
          </div>

          {/* Events + contact info */}
          {invitedEvents.length > 0 && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
              {invitedEvents.slice(0, 3).map((event, idx) => (
                <span key={event.id} className="whitespace-nowrap inline-block">
                  {event.icon}&nbsp;{event.name}
                  {(idx < Math.min(invitedEvents.length, 3) - 1 || invitedEvents.length > 3) && <span className="mx-1">•</span>}
                </span>
              ))}
              {invitedEvents.length > 3 && (
                <span className="whitespace-nowrap inline-block text-slate-400 dark:text-slate-500 font-medium">
                  +{invitedEvents.length - 3} more
                </span>
              )}
            </p>
          )}
          {guest.phone && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">📱 {guest.phone}</p>
          )}
          {guest.notes && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 italic">📝 {guest.notes}</p>
          )}
        </div>
      </div>
    </div>
  );
};
