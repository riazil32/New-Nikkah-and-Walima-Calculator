import React, { useState, useMemo, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { 
  Guest, 
  GuestSide, 
  GuestGender, 
  GuestType,
  GuestRole,
  GuestGroup,
  WeddingEventConfig,
  GuestManagerData 
} from '../types';
import { Users, Plus, Trash, Edit, X, Check, ChevronDown } from './Icons';

// Generate unique ID
const generateId = (): string => Math.random().toString(36).substring(2, 9);

// Role options with display info
const GUEST_ROLES: { value: GuestRole; label: string; icon: string }[] = [
  { value: 'guest', label: 'Guest', icon: '👤' },
  { value: 'vip', label: 'VIP / Close Family', icon: '⭐' },
  { value: 'bridesmaid', label: 'Bridesmaid', icon: '👗' },
  { value: 'groomsman', label: 'Groomsman', icon: '🤵' },
  { value: 'colleague', label: 'Colleague', icon: '💼' },
  { value: 'wali', label: 'Wali', icon: '📜' },
  { value: 'witness', label: 'Witness', icon: '✍️' },
];

// Default wedding events
const DEFAULT_EVENTS: WeddingEventConfig[] = [
  { id: 'nikkah', name: 'Nikkah', icon: '💍', enabled: true },
  { id: 'walima', name: 'Walima', icon: '🍽️', enabled: true },
  { id: 'mehndi', name: 'Mehndi', icon: '🌸', enabled: false },
  { id: 'dholki', name: 'Dholki', icon: '🪘', enabled: false },
  { id: 'civil', name: 'Civil Registry', icon: '📝', enabled: false },
];

// Default guest manager data
const getDefaultGuestManagerData = (): GuestManagerData => ({
  guests: [],
  groups: [],
  events: DEFAULT_EVENTS,
  segregationMode: false,
});

// Create a new guest
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
  name,
  side,
  gender,
  type,
  role,
  groupId,
  invitedTo,
  seating: {},
  createdAt: new Date().toISOString(),
});

// Settings gear icon
const SettingsIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

// Migrate old data to new schema
const migrateData = (stored: Partial<GuestManagerData>): GuestManagerData => {
  const defaults = getDefaultGuestManagerData();
  return {
    guests: (stored.guests || []).map(g => ({
      ...g,
      role: g.role || 'guest', // Add default role if missing
      groupId: g.groupId || undefined,
    })),
    groups: stored.groups || [],
    events: stored.events || defaults.events,
    segregationMode: stored.segregationMode ?? false,
  };
};

export const GuestManager: React.FC = () => {
  // Persisted data with migration
  const [rawData, setRawData] = useLocalStorage<GuestManagerData>(
    'guest-manager-data',
    getDefaultGuestManagerData()
  );
  
  // Apply migration to ensure all fields exist
  const data = useMemo(() => migrateData(rawData), [rawData]);
  
  // Wrap setData to always apply migration to prev value
  const setData = (updater: (prev: GuestManagerData) => GuestManagerData) => {
    setRawData(prev => updater(migrateData(prev)));
  };

  // UI State
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [addMode, setAddMode] = useState<'individual' | 'family'>('individual');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Individual guest form
  const [individualForm, setIndividualForm] = useState({
    name: '',
    side: 'groom' as GuestSide,
    gender: 'male' as GuestGender,
    type: 'adult' as GuestType,
    role: 'guest' as GuestRole,
    invitedTo: [] as string[],
  });

  // Family form
  const [familyForm, setFamilyForm] = useState({
    familyName: '',
    side: 'groom' as GuestSide,
    invitedTo: [] as string[],
    members: [
      { name: '', gender: 'male' as GuestGender, type: 'adult' as GuestType, role: 'vip' as GuestRole },
      { name: '', gender: 'female' as GuestGender, type: 'adult' as GuestType, role: 'vip' as GuestRole },
    ],
  });

  // Get enabled events only
  const enabledEvents = useMemo(() => 
    data.events.filter(e => e.enabled),
    [data.events]
  );

  // Context-aware defaults based on active filter
  useEffect(() => {
    if (activeFilter === 'all') {
      setIndividualForm(prev => ({ ...prev, invitedTo: enabledEvents.map(e => e.id) }));
      setFamilyForm(prev => ({ ...prev, invitedTo: enabledEvents.map(e => e.id) }));
    } else {
      setIndividualForm(prev => ({ ...prev, invitedTo: [activeFilter] }));
      setFamilyForm(prev => ({ ...prev, invitedTo: [activeFilter] }));
    }
  }, [activeFilter, enabledEvents]);

  // Filter guests based on active filter
  const filteredGuests = useMemo(() => {
    if (activeFilter === 'all') return data.guests;
    return data.guests.filter(g => g.invitedTo.includes(activeFilter));
  }, [data.guests, activeFilter]);

  // Organize guests by groups and ungrouped
  const organizedGuests = useMemo(() => {
    const grouped: { group: GuestGroup; members: Guest[] }[] = [];
    const ungrouped: Guest[] = [];

    // Get all groups with their members
    data.groups.forEach(group => {
      const members = filteredGuests.filter(g => g.groupId === group.id);
      if (members.length > 0) {
        grouped.push({ group, members });
      }
    });

    // Get ungrouped guests
    filteredGuests.forEach(guest => {
      if (!guest.groupId) {
        ungrouped.push(guest);
      }
    });

    return { grouped, ungrouped };
  }, [data.groups, filteredGuests]);

  // Stats calculations
  const stats = useMemo(() => {
    const guests = activeFilter === 'all' 
      ? data.guests 
      : data.guests.filter(g => g.invitedTo.includes(activeFilter));
    
    const total = guests.length;
    const adults = guests.filter(g => g.type === 'adult').length;
    const children = guests.filter(g => g.type === 'child').length;
    const groomSide = guests.filter(g => g.side === 'groom').length;
    const brideSide = guests.filter(g => g.side === 'bride').length;
    const males = guests.filter(g => g.gender === 'male').length;
    const females = guests.filter(g => g.gender === 'female').length;
    const families = data.groups.length;

    return { total, adults, children, groomSide, brideSide, males, females, families };
  }, [data.guests, data.groups, activeFilter]);

  // Toggle group expansion
  const toggleGroupExpanded = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  // Add individual guest
  const handleAddIndividual = () => {
    if (!individualForm.name.trim() || individualForm.invitedTo.length === 0) return;
    
    const newGuest = createGuest(
      individualForm.name.trim(),
      individualForm.side,
      individualForm.gender,
      individualForm.type,
      individualForm.role,
      individualForm.invitedTo
    );

    setData(prev => ({
      ...prev,
      guests: [...prev.guests, newGuest]
    }));

    setIndividualForm(prev => ({ ...prev, name: '' }));
  };

  // Add family group
  const handleAddFamily = () => {
    const validMembers = familyForm.members.filter(m => m.name.trim());
    if (validMembers.length === 0 || familyForm.invitedTo.length === 0) return;

    const groupId = generateId();
    
    // Auto-generate family name if not provided
    const familyName = familyForm.familyName.trim() || 
      `The ${validMembers[0].name.split(' ').pop() || 'Guest'} Family`;

    // Create the group
    const newGroup: GuestGroup = {
      id: groupId,
      name: familyName,
      memberIds: [],
      createdAt: new Date().toISOString(),
    };

    // Create guests for each member
    const newGuests: Guest[] = validMembers.map(member => 
      createGuest(
        member.name.trim(),
        familyForm.side,
        member.gender,
        member.type,
        member.role,
        familyForm.invitedTo,
        groupId
      )
    );

    // Update group with member IDs
    newGroup.memberIds = newGuests.map(g => g.id);

    // Auto-expand newly created family
    setExpandedGroups(prev => new Set([...prev, groupId]));

    setData(prev => ({
      ...prev,
      guests: [...prev.guests, ...newGuests],
      groups: [...prev.groups, newGroup]
    }));

    // Reset form
    setFamilyForm({
      familyName: '',
      side: 'groom',
      invitedTo: enabledEvents.map(e => e.id),
      members: [
        { name: '', gender: 'male', type: 'adult', role: 'vip' },
        { name: '', gender: 'female', type: 'adult', role: 'vip' },
      ],
    });
  };

  // Add member row to family form
  const addFamilyMember = () => {
    setFamilyForm(prev => ({
      ...prev,
      members: [...prev.members, { name: '', gender: 'male', type: 'child', role: 'guest' }]
    }));
  };

  // Remove member row from family form
  const removeFamilyMember = (index: number) => {
    if (familyForm.members.length <= 1) return;
    setFamilyForm(prev => ({
      ...prev,
      members: prev.members.filter((_, i) => i !== index)
    }));
  };

  // Update family member
  const updateFamilyMember = (index: number, field: string, value: string) => {
    setFamilyForm(prev => ({
      ...prev,
      members: prev.members.map((m, i) => i === index ? { ...m, [field]: value } : m)
    }));
  };

  // Delete guest
  const handleDeleteGuest = (id: string) => {
    const guest = data.guests.find(g => g.id === id);
    
    setData(prev => {
      let newGroups = prev.groups;
      
      // If guest was in a group, update the group
      if (guest?.groupId) {
        newGroups = prev.groups.map(g => 
          g.id === guest.groupId 
            ? { ...g, memberIds: g.memberIds.filter(mid => mid !== id) }
            : g
        ).filter(g => g.memberIds.length > 0); // Remove empty groups
      }
      
      return {
        ...prev,
        guests: prev.guests.filter(g => g.id !== id),
        groups: newGroups
      };
    });
  };

  // Delete entire group
  const handleDeleteGroup = (groupId: string) => {
    setData(prev => ({
      ...prev,
      guests: prev.guests.filter(g => g.groupId !== groupId),
      groups: prev.groups.filter(g => g.id !== groupId)
    }));
  };

  // Add member to existing family (inherits from first member)
  const handleAddMemberToFamily = (groupId: string) => {
    const group = data.groups.find(g => g.id === groupId);
    if (!group) return;

    // Check if there's already an empty-name member being edited in this group
    // If so, just focus on that one instead of creating another
    const existingEmptyMember = data.guests.find(g => g.groupId === groupId && g.name.trim() === '');
    if (existingEmptyMember) {
      setExpandedGroups(prev => new Set([...prev, groupId]));
      setEditingGuest(existingEmptyMember);
      return;
    }

    // Find first member to inherit from
    const firstMember = data.guests.find(g => g.groupId === groupId);
    
    const newGuest = createGuest(
      '', // Empty name - user will fill in
      firstMember?.side || 'groom',
      'male', // Default gender
      'adult', // Default type
      firstMember?.role || 'vip', // Inherit role
      firstMember?.invitedTo || enabledEvents.map(e => e.id), // Inherit events
      groupId
    );

    // Expand the family and add the new member
    setExpandedGroups(prev => new Set([...prev, groupId]));
    
    setData(prev => ({
      ...prev,
      guests: [...prev.guests, newGuest],
      groups: prev.groups.map(g => 
        g.id === groupId 
          ? { ...g, memberIds: [...g.memberIds, newGuest.id] }
          : g
      )
    }));

    // Auto-edit the new member
    setEditingGuest(newGuest);
  };

  // Update guest
  const handleUpdateGuest = (updatedGuest: Guest) => {
    // Don't save if name is empty
    if (!updatedGuest.name.trim()) return;
    
    setData(prev => ({
      ...prev,
      guests: prev.guests.map(g => g.id === updatedGuest.id ? updatedGuest : g)
    }));
    setEditingGuest(null);
  };

  // Cancel editing - clean up empty-name guests
  const handleCancelEdit = (guestId: string) => {
    const guest = data.guests.find(g => g.id === guestId);
    
    // If the guest has no name (was just created via + button), delete them
    if (guest && !guest.name.trim()) {
      setData(prev => {
        let newGroups = prev.groups;
        
        // If guest was in a group, update the group
        if (guest.groupId) {
          newGroups = prev.groups.map(g => 
            g.id === guest.groupId 
              ? { ...g, memberIds: g.memberIds.filter(mid => mid !== guestId) }
              : g
          ).filter(g => g.memberIds.length > 0);
        }
        
        return {
          ...prev,
          guests: prev.guests.filter(g => g.id !== guestId),
          groups: newGroups
        };
      });
    }
    
    setEditingGuest(null);
  };

  // Toggle event enabled status
  const toggleEventEnabled = (eventId: string) => {
    setData(prev => ({
      ...prev,
      events: prev.events.map(e => 
        e.id === eventId ? { ...e, enabled: !e.enabled } : e
      )
    }));
  };

  // Toggle segregation mode
  const toggleSegregationMode = () => {
    setData(prev => ({
      ...prev,
      segregationMode: !prev.segregationMode
    }));
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

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (addMode === 'individual') {
        handleAddIndividual();
      }
    }
  };

  // Get role display
  const getRoleDisplay = (role: GuestRole) => {
    const roleInfo = GUEST_ROLES.find(r => r.value === role);
    return roleInfo || GUEST_ROLES[0];
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 mb-4 shadow-lg shadow-blue-200 dark:shadow-blue-900/30">
          <Users className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-serif font-bold text-slate-800 dark:text-white mb-2">
          Guest Manager
        </h2>
        <p className="text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
          Manage your guest list across multiple events
        </p>
      </div>

      {/* Stats Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-3 sm:p-4 mb-4">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <h3 className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            {activeFilter === 'all' ? 'All Guests' : enabledEvents.find(e => e.id === activeFilter)?.name + ' Guests'}
          </h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
            <div className="flex items-center justify-center gap-1">
              <span className="text-lg font-bold text-teal-600 dark:text-teal-400">{stats.groomSide}</span>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span className="text-lg font-bold text-rose-600 dark:text-rose-400">{stats.brideSide}</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Groom/Bride</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{stats.males}</span>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span className="text-lg font-bold text-pink-600 dark:text-pink-400">{stats.females}</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Male/Female</p>
          </div>
        </div>
      </div>

      {/* Filter Header with Manage Button */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Filter by event
          </p>
          <button
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors flex-shrink-0"
          >
            <SettingsIcon className="w-3.5 h-3.5" />
            Manage Events
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <button
            onClick={() => setActiveFilter('all')}
            className={`flex-shrink-0 px-3 py-2 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
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
                className={`flex-shrink-0 px-3 py-2 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
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

      {/* Add Guest Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-3 sm:p-4 mb-4">
        {/* Mode Toggle */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">Add:</span>
          <div className="flex flex-1 sm:flex-initial rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600">
            <button
              onClick={() => setAddMode('individual')}
              className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold transition-colors ${
                addMode === 'individual'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
              }`}
            >
              👤 Individual
            </button>
            <button
              onClick={() => setAddMode('family')}
              className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold transition-colors ${
                addMode === 'family'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
              }`}
            >
              👨‍👩‍👧 Family
            </button>
          </div>
        </div>

        {/* Individual Form */}
        {addMode === 'individual' && (
          <div>
            {/* Desktop: Single row | Mobile: Stacked */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr,auto] gap-3 mb-3">
              <input
                type="text"
                value={individualForm.name}
                onChange={(e) => setIndividualForm(prev => ({ ...prev, name: e.target.value }))}
                onKeyDown={handleKeyDown}
                placeholder="Guest name..."
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border-2 border-transparent focus:border-blue-400 rounded-xl transition-all outline-none font-medium text-slate-800 dark:text-white placeholder:text-slate-400"
              />
              <select
                value={individualForm.role}
                onChange={(e) => setIndividualForm(prev => ({ ...prev, role: e.target.value as GuestRole }))}
                className="w-full md:w-48 px-3 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none font-medium text-slate-800 dark:text-white text-sm"
              >
                {GUEST_ROLES.map(role => (
                  <option key={role.value} value={role.value}>{role.icon} {role.label}</option>
                ))}
              </select>
            </div>
            
            {/* Toggles Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              {/* Side */}
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Side</p>
                <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600">
                  {(['groom', 'bride', 'joint'] as const).map(side => (
                    <button
                      key={side}
                      onClick={() => setIndividualForm(prev => ({ ...prev, side }))}
                      className={`flex-1 px-2 py-2 text-xs font-semibold transition-colors ${
                        individualForm.side === side
                          ? side === 'groom' ? 'bg-teal-500 text-white' 
                            : side === 'bride' ? 'bg-rose-500 text-white' 
                            : 'bg-violet-500 text-white'
                          : 'bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
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
                <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600">
                  {(['male', 'female'] as const).map(gender => (
                    <button
                      key={gender}
                      onClick={() => setIndividualForm(prev => ({ ...prev, gender }))}
                      className={`flex-1 px-2 py-2 text-xs font-semibold transition-colors ${
                        individualForm.gender === gender
                          ? gender === 'male' ? 'bg-blue-500 text-white' : 'bg-pink-500 text-white'
                          : 'bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
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
                <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600">
                  {(['adult', 'child'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setIndividualForm(prev => ({ ...prev, type }))}
                      className={`flex-1 px-2 py-2 text-xs font-semibold transition-colors ${
                        individualForm.type === type
                          ? type === 'adult' ? 'bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-800' : 'bg-amber-500 text-white'
                          : 'bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {type === 'adult' ? 'Adult' : 'Child'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Events */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Invite to</p>
              <div className="flex flex-wrap gap-2">
                {enabledEvents.map(event => (
                  <button
                    key={event.id}
                    onClick={() => toggleIndividualEvent(event.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      individualForm.invitedTo.includes(event.id)
                        ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-2 border-blue-400'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-2 border-transparent'
                    }`}
                  >
                    {event.name}
                    {individualForm.invitedTo.includes(event.id) && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Add Button */}
            <button
              onClick={handleAddIndividual}
              disabled={!individualForm.name.trim() || individualForm.invitedTo.length === 0}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:dark:bg-slate-600 text-white font-bold rounded-xl transition-all disabled:cursor-not-allowed"
            >
              <Plus className="w-5 h-5" />
              Add Guest
            </button>
          </div>
        )}

        {/* Family Form */}
        {addMode === 'family' && (
          <div>
            {/* Family Name + Side - Desktop row */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr,200px] gap-3 mb-3">
              <input
                type="text"
                value={familyForm.familyName}
                onChange={(e) => setFamilyForm(prev => ({ ...prev, familyName: e.target.value }))}
                placeholder="Family name (optional, e.g., The Khan Family)"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border-2 border-transparent focus:border-blue-400 rounded-xl transition-all outline-none font-medium text-slate-800 dark:text-white placeholder:text-slate-400"
              />
              <div>
                <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600 h-full">
                  {(['groom', 'bride', 'joint'] as const).map(side => (
                    <button
                      key={side}
                      onClick={() => setFamilyForm(prev => ({ ...prev, side }))}
                      className={`flex-1 px-2 py-2 text-xs font-semibold transition-colors ${
                        familyForm.side === side
                          ? side === 'groom' ? 'bg-teal-500 text-white' 
                            : side === 'bride' ? 'bg-rose-500 text-white' 
                            : 'bg-violet-500 text-white'
                          : 'bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {side === 'groom' ? 'Groom' : side === 'bride' ? 'Bride' : 'Both'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Events */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Invite to</p>
              <div className="flex flex-wrap gap-2">
                {enabledEvents.map(event => (
                  <button
                    key={event.id}
                    onClick={() => toggleFamilyEvent(event.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      familyForm.invitedTo.includes(event.id)
                        ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-2 border-blue-400'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-2 border-transparent'
                    }`}
                  >
                    {event.name}
                    {familyForm.invitedTo.includes(event.id) && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Members */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">Family members</p>
              <div className="space-y-2">
                {familyForm.members.map((member, index) => (
                  <div key={index} className="flex flex-col md:flex-row gap-2 items-stretch md:items-center p-2 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                    {/* Number + Name + Role (on desktop) */}
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-500 w-5 text-center flex-shrink-0">
                        {index + 1}
                      </span>
                      <input
                        type="text"
                        value={member.name}
                        onChange={(e) => updateFamilyMember(index, 'name', e.target.value)}
                        placeholder={index === 0 ? "e.g., Mr. Khan" : index === 1 ? "e.g., Mrs. Khan" : `Member ${index + 1}`}
                        className="flex-1 px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg outline-none text-sm font-medium text-slate-800 dark:text-white placeholder:text-slate-400"
                      />
                      {/* Role - visible on desktop in same row */}
                      <select
                        value={member.role}
                        onChange={(e) => updateFamilyMember(index, 'role', e.target.value)}
                        className="hidden md:block w-40 px-2 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg outline-none text-xs font-medium text-slate-800 dark:text-white"
                      >
                        {GUEST_ROLES.map(role => (
                          <option key={role.value} value={role.value}>{role.icon} {role.label}</option>
                        ))}
                      </select>
                    </div>
                    {/* Dropdowns row - no left padding on mobile */}
                    <div className="flex items-center gap-1.5">
                      <select
                        value={member.gender}
                        onChange={(e) => updateFamilyMember(index, 'gender', e.target.value)}
                        className="flex-1 md:w-24 px-2 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg outline-none text-xs font-medium text-slate-800 dark:text-white"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                      <select
                        value={member.type}
                        onChange={(e) => updateFamilyMember(index, 'type', e.target.value)}
                        className="flex-1 md:w-24 px-2 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg outline-none text-xs font-medium text-slate-800 dark:text-white"
                      >
                        <option value="adult">Adult</option>
                        <option value="child">Child</option>
                      </select>
                      {/* Role - visible on mobile only */}
                      <select
                        value={member.role}
                        onChange={(e) => updateFamilyMember(index, 'role', e.target.value)}
                        className="flex-1 md:hidden px-2 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg outline-none text-xs font-medium text-slate-800 dark:text-white"
                      >
                        {GUEST_ROLES.map(role => (
                          <option key={role.value} value={role.value}>{role.icon} {role.label}</option>
                        ))}
                      </select>
                      {familyForm.members.length > 1 && (
                        <button
                          onClick={() => removeFamilyMember(index)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={addFamilyMember}
                className="mt-3 flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add another member
              </button>
            </div>

            {/* Add Button */}
            <button
              onClick={handleAddFamily}
              disabled={familyForm.members.every(m => !m.name.trim()) || familyForm.invitedTo.length === 0}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:dark:bg-slate-600 text-white font-bold rounded-xl transition-all disabled:cursor-not-allowed"
            >
              <Plus className="w-5 h-5" />
              Add Family
            </button>
          </div>
        )}
      </div>

      {/* Guest List */}
      <div className="space-y-3">
        {filteredGuests.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-12 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              {data.guests.length === 0 
                ? 'No guests yet. Start adding your guest list above!'
                : `No guests invited to ${enabledEvents.find(e => e.id === activeFilter)?.name || 'this event'}`
              }
            </p>
          </div>
        ) : (
          <>
            {/* Grouped guests (Families) - Boxed & Collapsible */}
            {organizedGuests.grouped.map(({ group, members }) => {
              const isExpanded = expandedGroups.has(group.id);
              return (
                <div key={group.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border-2 border-violet-200 dark:border-violet-800/50 overflow-hidden">
                  {/* Group Header - Distinct background */}
                  <button
                    onClick={() => toggleGroupExpanded(group.id)}
                    className="w-full px-4 py-3 flex items-center justify-between bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-violet-200 dark:bg-violet-800/50 flex items-center justify-center text-lg">
                        👨‍👩‍👧
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-slate-800 dark:text-white">{group.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {members.length} members • {members.filter(m => m.type === 'adult').length} adults, {members.filter(m => m.type === 'child').length} kids
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAddMemberToFamily(group.id); }}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        title="Add member"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title="Delete family"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                      <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  
                  {/* Group Members - Collapsible Content (no indent, clean list) */}
                  {isExpanded && (
                    <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {members.map(guest => (
                        <GuestRow 
                          key={guest.id}
                          guest={guest} 
                          enabledEvents={enabledEvents}
                          onEdit={() => setEditingGuest(guest)}
                          onDelete={() => handleDeleteGuest(guest.id)}
                          isEditing={editingGuest?.id === guest.id}
                          editingGuest={editingGuest}
                          onSave={handleUpdateGuest}
                          onCancelEdit={() => handleCancelEdit(guest.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Ungrouped guests (Individuals) - in their own card */}
            {organizedGuests.ungrouped.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {organizedGuests.ungrouped.map(guest => (
                    <GuestRow 
                      key={guest.id} 
                      guest={guest} 
                      enabledEvents={enabledEvents}
                      onEdit={() => setEditingGuest(guest)}
                      onDelete={() => handleDeleteGuest(guest.id)}
                      isEditing={editingGuest?.id === guest.id}
                      editingGuest={editingGuest}
                      onSave={handleUpdateGuest}
                      onCancelEdit={() => handleCancelEdit(guest.id)}
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
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowSettingsModal(false)}
        >
          <div 
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Settings</h3>
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Segregation Mode */}
            <div className="mb-6">
              <label className="flex items-center justify-between cursor-pointer p-3 bg-slate-50 dark:bg-slate-700 rounded-xl">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-white">Segregation Mode</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Track male/female counts for seating</p>
                </div>
                <div className={`relative w-11 h-6 rounded-full transition-colors ${
                  data.segregationMode ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-500'
                }`}>
                  <input
                    type="checkbox"
                    checked={data.segregationMode}
                    onChange={toggleSegregationMode}
                    className="sr-only"
                  />
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    data.segregationMode ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </div>
              </label>
            </div>

            {/* Event Configuration */}
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Events to track
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                Enable the events you want to track guest invitations for:
              </p>
              <div className="space-y-2">
                {data.events.map(event => (
                  <button
                    key={event.id}
                    onClick={() => toggleEventEnabled(event.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                      event.enabled
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-400 text-blue-700 dark:text-blue-300'
                        : 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <span className="text-xl">{event.icon}</span>
                    <span className="flex-1 font-medium">{event.name}</span>
                    {event.enabled && <Check className="w-5 h-5" />}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowSettingsModal(false)}
              className="w-full mt-6 py-3 bg-slate-800 dark:bg-white text-white dark:text-slate-800 font-bold rounded-xl hover:opacity-90 transition-opacity"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Guest Row Component - Clean list item
interface GuestRowProps {
  guest: Guest;
  enabledEvents: WeddingEventConfig[];
  onEdit: () => void;
  onDelete: () => void;
  isEditing: boolean;
  editingGuest: Guest | null;
  onSave: (guest: Guest) => void;
  onCancelEdit: () => void;
}

const GuestRow: React.FC<GuestRowProps> = ({
  guest,
  enabledEvents,
  onEdit,
  onDelete,
  isEditing,
  editingGuest,
  onSave,
  onCancelEdit,
}) => {
  const [editForm, setEditForm] = useState(guest);

  useEffect(() => {
    if (isEditing && editingGuest) {
      setEditForm(editingGuest);
    }
  }, [isEditing, editingGuest]);

  const toggleEvent = (eventId: string) => {
    setEditForm(prev => ({
      ...prev,
      invitedTo: prev.invitedTo.includes(eventId)
        ? prev.invitedTo.filter(e => e !== eventId)
        : [...prev.invitedTo, eventId]
    }));
  };

  const getRoleInfo = (role: GuestRole) => {
    return GUEST_ROLES.find(r => r.value === role) || GUEST_ROLES[0];
  };

  if (isEditing) {
    return (
      <div className="p-3 bg-blue-50/50 dark:bg-blue-900/10">
        <div className="space-y-2">
          {/* Row 1: Name + Role (50/50 on mobile, flexible on desktop) */}
          <div className="flex gap-2">
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Guest name..."
              className="w-1/2 md:flex-1 min-w-0 px-3 py-2 bg-white dark:bg-slate-700 border-2 border-blue-400 rounded-lg outline-none font-medium text-sm text-slate-800 dark:text-white"
            />
            <select
              value={editForm.role}
              onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value as GuestRole }))}
              className="w-1/2 md:w-48 px-2 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg outline-none text-xs font-medium text-slate-800 dark:text-white"
            >
              {GUEST_ROLES.map(role => (
                <option key={role.value} value={role.value}>{role.icon} {role.label}</option>
              ))}
            </select>
          </div>

          {/* Row 2: Side, Gender, Type dropdowns */}
          <div className="flex gap-2">
            <select
              value={editForm.side}
              onChange={(e) => setEditForm(prev => ({ ...prev, side: e.target.value as GuestSide }))}
              className="flex-1 px-2 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg outline-none text-xs font-medium text-slate-800 dark:text-white"
            >
              <option value="groom">Groom's</option>
              <option value="bride">Bride's</option>
              <option value="joint">Both</option>
            </select>
            <select
              value={editForm.gender}
              onChange={(e) => setEditForm(prev => ({ ...prev, gender: e.target.value as GuestGender }))}
              className="flex-1 px-2 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg outline-none text-xs font-medium text-slate-800 dark:text-white"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
            <select
              value={editForm.type}
              onChange={(e) => setEditForm(prev => ({ ...prev, type: e.target.value as GuestType }))}
              className="flex-1 px-2 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg outline-none text-xs font-medium text-slate-800 dark:text-white"
            >
              <option value="adult">Adult</option>
              <option value="child">Child</option>
            </select>
          </div>

          {/* Row 3: Events - matching Individual Add styling */}
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Invite to</p>
            <div className="flex flex-wrap gap-2">
              {enabledEvents.map(event => (
                <button
                  key={event.id}
                  onClick={() => toggleEvent(event.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    editForm.invitedTo.includes(event.id)
                      ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-2 border-blue-400'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-2 border-transparent'
                  }`}
                >
                  {event.name}
                  {editForm.invitedTo.includes(event.id) && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          </div>

          {/* Row 4: Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={onCancelEdit}
              className="flex items-center gap-1 px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-xs font-medium"
            >
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
            <button
              onClick={() => onSave(editForm)}
              disabled={editForm.invitedTo.length === 0 || !editForm.name.trim()}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg text-xs font-bold"
            >
              <Check className="w-3.5 h-3.5" /> Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  const roleInfo = getRoleInfo(guest.role);

  // Build events text with dot separators
  const invitedEvents = enabledEvents.filter(event => guest.invitedTo.includes(event.id));
  
  // Role badge component
  const RoleBadge = guest.role !== 'guest' ? (
    <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">
      {roleInfo.icon} {roleInfo.label}
    </span>
  ) : null;

  // Side badge component
  const SideBadge = (
    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap ${
      guest.side === 'groom'
        ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400'
        : guest.side === 'bride'
        ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'
        : 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400'
    }`}>
      {guest.side === 'groom' ? "Groom's" : guest.side === 'bride' ? "Bride's" : 'Both'}
    </span>
  );

  return (
    <div className="relative px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
      {/* Actions - Absolute top right */}
      <div className="absolute top-3 right-2 flex items-center">
        <button
          onClick={onEdit}
          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
          title="Edit"
        >
          <Edit className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
          title="Delete"
        >
          <Trash className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 relative ${
          guest.side === 'groom' 
            ? 'bg-teal-100 dark:bg-teal-900/30' 
            : guest.side === 'bride'
            ? 'bg-rose-100 dark:bg-rose-900/30'
            : 'bg-violet-100 dark:bg-violet-900/30'
        }`}>
          {guest.gender === 'male' ? '👨' : '👩'}
          {guest.type === 'child' && (
            <span className="absolute -bottom-0.5 -right-0.5 text-[10px] bg-amber-400 rounded-full w-4 h-4 flex items-center justify-center">👶</span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Desktop: Name + Role + Side on same row */}
          <div className="hidden md:flex items-center gap-2 flex-wrap pr-14">
            <span className="font-semibold text-slate-800 dark:text-white">
              {guest.name}
            </span>
            {RoleBadge}
            {SideBadge}
          </div>

          {/* Mobile: Name on row 1, Badges on row 2 */}
          <div className="md:hidden">
            <p className="font-semibold text-slate-800 dark:text-white pr-14">
              {guest.name}
            </p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {RoleBadge}
              {SideBadge}
            </div>
          </div>

          {/* Events as subtle text */}
          {invitedEvents.length > 0 && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 leading-relaxed">
              {invitedEvents.map((event, idx) => (
                <span key={event.id} className="whitespace-nowrap inline-block">
                  {event.icon}&nbsp;{event.name}
                  {idx < invitedEvents.length - 1 && <span className="mx-1">•</span>}
                </span>
              ))}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
