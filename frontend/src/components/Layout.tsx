import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import type { User } from '../types';

interface LayoutProps {
  user: User;
  onLogout: () => void;
  onCreateNote?: () => string;
}


export default function Layout({ user, onLogout, onCreateNote }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(true);

  const handleNewNote = () => {
    if (onCreateNote) {
      const id = onCreateNote();
      navigate(`/editor/${id}`);
    } else {
      navigate('/notes');
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-surface font-sans">
      {/* ── Sidebar ── */}
      <aside
        className="flex flex-col shrink-0 h-full overflow-hidden transition-all duration-200"
        style={{ width: collapsed ? '64px' : '260px', background: '#1a1d23' }}
      >
        {/* Brand */}
        <div className={`flex items-center ${collapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-5 border-b border-white/5 min-h-[72px]`}>
          {!collapsed ? (
            <>
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-white text-[18px]" style={{ fontVariationSettings:"'FILL' 1" }}>edit_note</span>
              </div>
              <div className="min-w-0">
                <p className="text-white font-display font-bold text-[15px] leading-tight">Peblo Sync</p>
                <p className="text-white/40 text-[10px] tracking-wider uppercase">AI Note-Taking</p>
              </div>
              <button
                onClick={() => setCollapsed(true)}
                className="ml-auto text-white/30 hover:text-white/70 transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setCollapsed(false)}
              className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
              title="Expand Sidebar"
            >
              <span className="material-symbols-outlined text-[22px]">menu</span>
            </button>
          )}
        </div>

        {/* Search */}
        {!collapsed && (
          <div className="px-3 py-3">
            <NavLink to="/search" className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 text-white/40 hover:text-white/70 hover:bg-white/8 transition-all text-[13px]">
              <span className="material-symbols-outlined text-[16px]">search</span>
              <span>Search</span>
            </NavLink>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
          <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <span className="material-symbols-outlined text-[20px] shrink-0">home</span>
            {!collapsed && <span>Home</span>}
          </NavLink>

          <NavLink to="/insights" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <span className="material-symbols-outlined text-[20px] shrink-0">bar_chart</span>
            {!collapsed && <span>Insights</span>}
          </NavLink>

          {!collapsed && (
            <div 
              className="px-3 pt-4 pb-1 flex items-center justify-between cursor-pointer group"
              onClick={() => setNotesExpanded(!notesExpanded)}
            >
              <p className="text-white/25 text-[10px] font-semibold uppercase tracking-widest group-hover:text-white/50 transition-colors">Notes</p>
              <span className="material-symbols-outlined text-white/25 text-[14px] group-hover:text-white/50 transition-colors">
                {notesExpanded ? 'expand_less' : 'expand_more'}
              </span>
            </div>
          )}

          {(!collapsed ? notesExpanded : true) && (
            <div className="space-y-0.5">
              <NavLink end to="/notes" className={({ isActive }) => `nav-link ${isActive && !location.search ? 'active' : ''}`}>
                <span className="material-symbols-outlined text-[20px] shrink-0 text-white/50">note_stack</span>
                {!collapsed && <span>All Notes</span>}
              </NavLink>

              <NavLink to="/notes?cat=To-Do" className={() => `nav-link ${location.search === '?cat=To-Do' ? 'active' : ''}`}>
                <span className={`w-2 h-2 rounded-full shrink-0 bg-blue-400`}></span>
                {!collapsed && <span>To-Do</span>}
              </NavLink>

              <NavLink to="/notes?cat=Project+Plan" className={() => `nav-link ${location.search === '?cat=Project+Plan' ? 'active' : ''}`}>
                <span className={`w-2 h-2 rounded-full shrink-0 bg-purple-400`}></span>
                {!collapsed && <span>Project Plan</span>}
              </NavLink>

              <NavLink to="/notes?cat=Meeting+Brief" className={() => `nav-link ${location.search === '?cat=Meeting+Brief' ? 'active' : ''}`}>
                <span className={`w-2 h-2 rounded-full shrink-0 bg-amber-400`}></span>
                {!collapsed && <span>Meeting Brief</span>}
              </NavLink>

              <NavLink to="/notes?cat=Work" className={() => `nav-link ${location.search === '?cat=Work' ? 'active' : ''}`}>
                <span className={`w-2 h-2 rounded-full shrink-0 bg-green-400`}></span>
                {!collapsed && <span>Work</span>}
              </NavLink>

              <NavLink to="/notes?cat=Drawing+Note" className={() => `nav-link ${location.search === '?cat=Drawing+Note' ? 'active' : ''}`}>
                <span className={`w-2 h-2 rounded-full shrink-0 bg-pink-400`}></span>
                {!collapsed && <span>Drawing Note</span>}
              </NavLink>
            </div>
          )}

          {!collapsed && (
            <div className="px-3 pt-4 pb-1">
              <p className="text-white/25 text-[10px] font-semibold uppercase tracking-widest">More</p>
            </div>
          )}

          <NavLink to="/trash" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <span className="material-symbols-outlined text-[20px] shrink-0">delete</span>
            {!collapsed && <span>Trash</span>}
          </NavLink>

          <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <span className="material-symbols-outlined text-[20px] shrink-0">settings</span>
            {!collapsed && <span>Settings</span>}
          </NavLink>
        </nav>

        {/* Upgrade */}
        {!collapsed && (
          <div className="px-3 pt-4 border-t border-white/5">
            <button className="w-full flex items-center gap-2 bg-accent/10 hover:bg-accent/20 text-accent rounded-lg px-4 py-3 text-[13px] font-semibold transition-colors">
              <span className="material-symbols-outlined text-[18px]">emoji_events</span>
              Upgrade your Plan
            </button>
          </div>
        )}

        {/* Logout (Sidebar) */}
        <div className="px-3 pb-4 pt-2">
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-2 text-red-400/80 hover:text-red-400 hover:bg-red-400/10 rounded-lg px-3 py-2 text-[13px] transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            {!collapsed && <span>Log out</span>}
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="shrink-0 bg-card border-b border-border px-6 py-3 flex items-center gap-4">
          {/* Greeting / Breadcrumb */}
          <div className="flex-1 min-w-0">
            <h1 className="text-[15px] font-semibold text-text-primary truncate">
              Good {getTimeOfDay()}, {user.name.split(' ')[0]}.
            </h1>
            <p className="text-[11px] text-text-muted uppercase tracking-wider">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          {/* Search */}
          <div className="hidden md:flex items-center gap-2 bg-surface rounded-lg border border-border px-3 py-2 w-56">
            <span className="material-symbols-outlined text-text-muted text-[16px]">search</span>
            <NavLink to="/search" className="text-[13px] text-text-muted flex-1 outline-none bg-transparent">Search...</NavLink>
          </div>

          {/* User chip (Profile only) */}
          <div className="flex items-center gap-3">
            <button
              className="flex items-center gap-2 bg-surface hover:bg-border rounded-full pl-3 pr-2 py-1.5 border border-border transition-colors cursor-pointer"
            >
              <div className="w-6 h-6 rounded-full bg-accent text-white text-[11px] font-bold flex items-center justify-center">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-[13px] font-medium text-text-primary max-w-[100px] truncate">{user.name}</span>
              <span className="material-symbols-outlined text-text-muted text-[16px]">person</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* ── Floating New Note Button ── */}
      <button
        onClick={handleNewNote}
        className="fixed bottom-6 right-6 flex items-center gap-2 bg-accent text-white rounded-full pl-5 pr-6 py-3.5 shadow-lg hover:bg-accent-dark transition-all hover:scale-105 active:scale-95 z-50 font-semibold text-[14px]"
      >
        <span className="material-symbols-outlined text-[20px]">add</span>
        New
      </button>
    </div>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}
