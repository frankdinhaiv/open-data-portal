# ViGen Arena: Core Layout Spec

**G3B Implementation Spec — App Shell & Navigation**

Date: 2026-03-12
Status: Ready for implementation
Language: TypeScript (React)
Theme: Light elegant (white/gray, blue accent, Inter font)
UI Framework: Shadcn/ui + Tailwind CSS

---

## 1. App Shell Structure

Root layout that wraps all pages. Includes topbar, sidebar, and main content area with responsive behavior.

```typescript
// app/layout.tsx

import React, { useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useGuestSession } from '@/lib/hooks/useGuestSession';
import { useAuthStore } from '@/lib/store/authStore';
import { Topbar } from '@/components/Topbar';
import { Sidebar } from '@/components/Sidebar';
import { AuthModal } from '@/components/AuthModal';
import { Toaster } from '@/components/ui/toaster';
import '@/styles/globals.css';

interface LayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: LayoutProps) {
  const { checkAuth } = useAuth();
  const { isInitialized: guestSessionInitialized } = useGuestSession();
  const { showAuthModal, setShowAuthModal } = useAuthStore();
  const [voteCount, setVoteCount] = React.useState(0);

  // Restore auth state on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Load vote count from backend (authenticated users only)
  useEffect(() => {
    const loadVoteCount = async () => {
      try {
        const response = await fetch('/api/votes/count', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setVoteCount(data.count || 0);
        }
      } catch (err) {
        console.warn('Failed to load vote count:', err);
      }
    };

    const token = localStorage.getItem('auth_token');
    if (token) {
      loadVoteCount();
      // Sync vote count every 10 seconds (polling)
      const interval = setInterval(loadVoteCount, 10000);
      return () => clearInterval(interval);
    }
  }, []);

  if (!guestSessionInitialized) {
    return <div className="flex h-screen items-center justify-center bg-white" />;
  }

  return (
    <html lang="vi">
      <body className="bg-white font-sans antialiased">
        <div className="flex h-screen flex-col">
          {/* Topbar */}
          <Topbar
            voteCount={voteCount}
            onAuthClick={() => setShowAuthModal(true)}
          />

          {/* Main content area */}
          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar - hidden on mobile, visible on tablet+ */}
            <div className="hidden md:block w-64 border-r border-gray-200 bg-gray-50">
              <Sidebar />
            </div>

            {/* Main content */}
            <main className="flex-1 overflow-auto bg-white">
              {children}
            </main>
          </div>
        </div>

        {/* Auth modal (guest only) */}
        <AuthModal
          isOpen={showAuthModal}
          onOpenChange={setShowAuthModal}
          onAuthSuccess={() => {
            setShowAuthModal(false);
            // Re-load vote count
            window.location.reload();
          }}
        />

        {/* Toast notifications */}
        <Toaster />
      </body>
    </html>
  );
}
```

---

## 2. Topbar Component

Sticky header with logo, vote counter (center, authenticated only), and auth button/avatar (right).

```typescript
// components/Topbar.tsx

import React from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { LogOut, User as UserIcon, ChevronDown } from 'lucide-react';

interface TopbarProps {
  voteCount: number;
  onAuthClick?: () => void;
}

export function Topbar({ voteCount, onAuthClick }: TopbarProps) {
  const { isLoggedIn, displayName, userId, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  const getAvatarFallback = () => {
    if (!displayName) return 'U';
    return displayName
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo / Home link */}
        <div className="flex items-center">
          <a href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-blue-600" />
            <span className="hidden sm:inline text-lg font-bold text-gray-900">
              ViGen Arena
            </span>
            <span className="sm:hidden text-lg font-bold text-gray-900">VA</span>
          </a>
        </div>

        {/* Vote counter (center, authenticated users only) */}
        {isLoggedIn && (
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <span className="text-lg">🗳️</span>
            <span>{voteCount} phiếu</span>
          </div>
        )}

        {/* Auth area (right) */}
        <div className="flex items-center gap-4">
          {!isLoggedIn ? (
            <Button
              onClick={onAuthClick}
              className="bg-blue-600 text-white hover:bg-blue-700 font-medium px-4 py-2 rounded-md"
              size="sm"
            >
              Đăng Nhập
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full hover:bg-gray-100 p-1.5 transition-colors duration-200">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`}
                      alt={displayName || 'User'}
                    />
                    <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold">
                      {getAvatarFallback()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-gray-900 hidden sm:inline max-w-[120px] truncate">
                    {displayName}
                  </span>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-xs text-gray-500">
                  {userEmail}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a
                    href="/profile"
                    className="flex items-center gap-2 cursor-pointer px-2 py-1.5 rounded-sm hover:bg-gray-100"
                  >
                    <UserIcon className="h-4 w-4" />
                    <span className="text-sm">Hồ Sơ</span>
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="flex items-center gap-2 cursor-pointer px-2 py-1.5 text-red-600 rounded-sm hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="text-sm">Đăng Xuất</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
```

---

## 3. Sidebar Component

Navigation menu with mode selection (Đấu Trường, Song Song, Trực Tiếp, Bảng Xếp Hạng), conversation history, and search.

```typescript
// components/Sidebar.tsx

import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Swords,
  Columns3,
  Radio,
  Trophy,
  Plus,
  Search,
  Trash2,
  MessageSquare,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Conversation {
  id: string;
  title: string;
  mode: 'arena' | 'side-by-side' | 'live' | 'leaderboard';
  created_at: string;
  updated_at: string;
}

export function Sidebar() {
  const location = useLocation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const modes = [
    { id: 'arena', label: 'Đấu Trường', icon: Swords, href: '/arena' },
    { id: 'side-by-side', label: 'Song Song', icon: Columns3, href: '/side-by-side' },
    { id: 'live', label: 'Trực Tiếp', icon: Radio, href: '/live' },
    { id: 'leaderboard', label: 'Bảng Xếp Hạng', icon: Trophy, href: '/leaderboard' },
  ];

  // Load conversations on mount
  useEffect(() => {
    const loadConversations = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('auth_token');
        const response = await fetch('/api/conversations', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (response.ok) {
          const data = await response.json();
          setConversations(data.conversations || []);
        }
      } catch (err) {
        console.warn('Failed to load conversations:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadConversations();

    // Refresh every 30 seconds
    const interval = setInterval(loadConversations, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filter conversations by search query
  const filteredConversations = conversations.filter((conv) =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort by most recent
  const sortedConversations = [...filteredConversations].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      setConversations(conversations.filter((c) => c.id !== conversationId));
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const isActivePath = (href: string) => location.pathname.startsWith(href);

  return (
    <div className="flex h-full flex-col bg-gray-50 border-r border-gray-200">
      {/* New conversation button */}
      <div className="p-4 border-b border-gray-200">
        <Button
          className="w-full bg-blue-600 text-white hover:bg-blue-700 font-medium rounded-md"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Cuộc Trò Chuyện Mới
        </Button>
      </div>

      {/* Mode navigation */}
      <div className="p-4 space-y-2 border-b border-gray-200">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isActive = isActivePath(mode.href);

          return (
            <a
              key={mode.id}
              href={mode.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors duration-200 ${
                isActive
                  ? 'bg-white text-blue-600 border border-blue-200'
                  : 'text-gray-700 hover:bg-white hover:text-gray-900'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-sm font-medium">{mode.label}</span>
            </a>
          );
        })}
      </div>

      <Separator className="my-0" />

      {/* Conversation history */}
      <div className="flex-1 flex flex-col px-4 py-4 overflow-hidden">
        {/* Search */}
        <div className="mb-4 relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Tìm kiếm..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 h-9 rounded-md border border-gray-300 bg-white text-sm"
          />
        </div>

        {/* Conversations list */}
        <ScrollArea className="flex-1 pr-4">
          {isLoading ? (
            <div className="text-xs text-gray-500 text-center py-4">
              Đang tải...
            </div>
          ) : sortedConversations.length === 0 ? (
            <div className="text-xs text-gray-500 text-center py-8">
              <MessageSquare className="h-5 w-5 mx-auto mb-2 text-gray-400" />
              Chưa có cuộc trò chuyện nào
            </div>
          ) : (
            <div className="space-y-1">
              {sortedConversations.map((conv) => (
                <div
                  key={conv.id}
                  className="flex items-center gap-2 group px-2 py-2 rounded-md hover:bg-white transition-colors duration-150"
                >
                  <a
                    href={`/${conv.mode}/${conv.id}`}
                    className="flex-1 text-xs font-medium text-gray-700 truncate hover:text-blue-600"
                  >
                    {conv.title}
                  </a>

                  {/* Delete button (hidden by default, visible on hover) */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="invisible group-hover:visible p-1 hover:bg-red-50 rounded-sm transition-colors">
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogTitle>Xóa cuộc trò chuyện?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Hành động này không thể hoàn tác. Cuộc trò chuyện sẽ bị xóa vĩnh viễn.
                      </AlertDialogDescription>
                      <div className="flex gap-2 justify-end">
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteConversation(conv.id)}
                          className="bg-red-600 text-white hover:bg-red-700"
                        >
                          Xóa
                        </AlertDialogAction>
                      </div>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
```

---

## 4. Mobile Responsive Navigation

Bottom nav for mobile (<768px), collapsible drawer for tablet (768-1023px), fixed sidebar for desktop (≥1024px).

```typescript
// components/MobileNav.tsx

import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu, Swords, Columns3, Radio, Trophy } from 'lucide-react';

const modes = [
  { id: 'arena', label: 'Đấu Trường', icon: Swords, href: '/arena' },
  { id: 'side-by-side', label: 'Song Song', icon: Columns3, href: '/side-by-side' },
  { id: 'live', label: 'Trực Tiếp', icon: Radio, href: '/live' },
  { id: 'leaderboard', label: 'Bảng Xếp Hạng', icon: Trophy, href: '/leaderboard' },
];

export function MobileNav() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const isActivePath = (href: string) => location.pathname.startsWith(href);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="px-4 py-4 border-b">
          <SheetTitle>ViGen Arena</SheetTitle>
        </SheetHeader>
        <div className="p-4 space-y-2">
          {modes.map((mode) => {
            const Icon = mode.icon;
            const isActive = isActivePath(mode.href);

            return (
              <a
                key={mode.id}
                href={mode.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm">{mode.label}</span>
              </a>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

### Responsive Layout Component

```typescript
// components/ResponsiveLayout.tsx

import React from 'react';
import { Topbar } from '@/components/Topbar';
import { Sidebar } from '@/components/Sidebar';
import { MobileNav } from '@/components/MobileNav';
import { AuthModal } from '@/components/AuthModal';
import { useAuthStore } from '@/lib/store/authStore';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  voteCount: number;
  onAuthClick?: () => void;
}

export function ResponsiveLayout({
  children,
  voteCount,
  onAuthClick,
}: ResponsiveLayoutProps) {
  const { showAuthModal, setShowAuthModal } = useAuthStore();

  return (
    <div className="flex h-screen flex-col bg-white">
      {/* Topbar with mobile nav button */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          {/* Mobile menu button */}
          <MobileNav />

          {/* Center content (logo on desktop, empty on mobile) */}
          <div className="hidden sm:flex items-center flex-1 justify-center">
            {/* Logo already in Topbar */}
          </div>

          {/* Topbar (vote counter + auth) */}
          <Topbar voteCount={voteCount} onAuthClick={onAuthClick} />
        </div>
      </header>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - hidden on mobile, visible on tablet+ */}
        <div className="hidden md:block w-64 border-r border-gray-200 bg-gray-50 overflow-hidden">
          <Sidebar />
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-auto bg-white">
          {children}
        </main>
      </div>

      {/* Auth modal */}
      <AuthModal
        isOpen={showAuthModal}
        onOpenChange={setShowAuthModal}
        onAuthSuccess={() => setShowAuthModal(false)}
      />
    </div>
  );
}
```

---

## 5. Tailwind Theme Configuration

```typescript
// tailwind.config.ts

import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Custom fonts
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },

      // Custom colors
      colors: {
        background: '#ffffff',
        foreground: '#1f2937',
        primary: '#2563eb', // blue-600
        'primary-foreground': '#ffffff',
        secondary: '#6b7280', // gray-500
        'secondary-foreground': '#ffffff',
        muted: '#9ca3af', // gray-400
        'muted-foreground': '#6b7280', // gray-500
        accent: '#2563eb', // blue-600
        'accent-foreground': '#ffffff',
        destructive: '#dc2626', // red-600
        'destructive-foreground': '#ffffff',
        border: '#e5e7eb', // gray-200
        input: '#f3f4f6', // gray-100
        ring: '#2563eb', // blue-600
      },

      // Custom spacing
      spacing: {
        '0': '0px',
        '1': '0.25rem',
        '2': '0.5rem',
        '3': '0.75rem',
        '4': '1rem',
        '5': '1.25rem',
        '6': '1.5rem',
        '8': '2rem',
        '10': '2.5rem',
        '12': '3rem',
        '16': '4rem',
      },

      // Custom border radius
      borderRadius: {
        none: '0px',
        sm: '0.25rem',
        base: '0.375rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        full: '9999px',
      },

      // Custom animations
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': {
            opacity: '0',
            transform: 'translateY(0.5rem)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        'slide-down': {
          '0%': {
            opacity: '0',
            transform: 'translateY(-0.5rem)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
      },

      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-down': 'slide-down 0.3s ease-out',
      },
    },
  },

  // Plugins
  plugins: [require('tailwindcss/plugin')],
};

export default config;
```

---

## 6. Vietnamese UI Labels Constants

```typescript
// lib/constants/vi.ts

export const VI_LABELS = {
  // Navigation
  nav: {
    arena: 'Đấu Trường',
    sideBySide: 'Song Song',
    live: 'Trực Tiếp',
    leaderboard: 'Bảng Xếp Hạng',
    newConversation: 'Cuộc Trò Chuyện Mới',
    search: 'Tìm kiếm...',
  },

  // Auth
  auth: {
    login: 'Đăng Nhập',
    logout: 'Đăng Xuất',
    register: 'Tạo Tài Khoản',
    loginWithGoogle: 'Đăng Nhập Bằng Google',
    loginWithEmail: 'Đăng Nhập Bằng Email',
    continueAsGuest: 'Tiếp Tục Là Khách',
    email: 'Email',
    password: 'Mật Khẩu',
    confirmPassword: 'Xác Nhận Mật Khẩu',
    forgotPassword: 'Quên Mật Khẩu?',
    rememberMe: 'Ghi Nhớ Tôi',
    or: 'Hoặc',
  },

  // User menu
  user: {
    profile: 'Hồ Sơ',
    settings: 'Cài Đặt',
    help: 'Trợ Giúp',
    logout: 'Đăng Xuất',
  },

  // Conversations
  conversation: {
    noConversations: 'Chưa có cuộc trò chuyện nào',
    deleteConversation: 'Xóa cuộc trò chuyện?',
    deleteConfirm: 'Hành động này không thể hoàn tác. Cuộc trò chuyện sẽ bị xóa vĩnh viễn.',
    loading: 'Đang tải...',
    delete: 'Xóa',
    cancel: 'Hủy',
  },

  // Voting
  vote: {
    voteCount: 'phiếu',
    voteButton: 'Bình Chọn',
    unvoteButton: 'Hủy Bình Chọn',
    voteSuccess: 'Bình chọn thành công!',
    voteFailed: 'Bình chọn thất bại. Vui lòng thử lại.',
  },

  // Errors
  error: {
    genericError: 'Có lỗi xảy ra. Vui lòng thử lại.',
    networkError: 'Lỗi kết nối. Vui lòng kiểm tra kết nối internet của bạn.',
    unauthorized: 'Vui lòng đăng nhập để tiếp tục.',
    notFound: 'Không tìm thấy.',
    badRequest: 'Yêu cầu không hợp lệ.',
  },

  // Buttons
  button: {
    save: 'Lưu',
    cancel: 'Hủy',
    submit: 'Gửi',
    next: 'Tiếp Theo',
    previous: 'Quay Lại',
    close: 'Đóng',
    loading: 'Đang xử lý...',
  },

  // Messages
  message: {
    loginPrompt: 'Để tiếp tục tham gia cuộc bình chọn, vui lòng đăng nhập hoặc tạo tài khoản.',
    guestLimitReached: 'Bạn đã đạt giới hạn số lần bình chọn. Vui lòng đăng nhập để tiếp tục.',
    loginSuccess: 'Đăng nhập thành công!',
    logoutSuccess: 'Đăng xuất thành công!',
  },
};

export const getLabel = (path: string): string => {
  const keys = path.split('.');
  let value: any = VI_LABELS;

  for (const key of keys) {
    value = value?.[key];
    if (!value) return path; // Fallback to path if not found
  }

  return typeof value === 'string' ? value : path;
};
```

---

## 7. Shadcn/ui Component Installation

```bash
# Install shadcn-ui CLI (if not already installed)
npm install -D shadcn-ui

# Initialize shadcn/ui in your project
npx shadcn-ui@latest init

# Install required components for ViGen Arena
npx shadcn-ui@latest add button
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add input
npx shadcn-ui@latest add select
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add card
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add tooltip
npx shadcn-ui@latest add scroll-area
npx shadcn-ui@latest add separator
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add alert-dialog
npx shadcn-ui@latest add sheet

# Install additional dependencies
npm install lucide-react zustand axios uuid
```

---

## 8. Global Styles & CSS Variables

```css
/* styles/globals.css */

@import 'tailwindcss/base';
@import 'tailwindcss/components';
@import 'tailwindcss/utilities';

@font-face {
  font-family: 'Inter';
  src: url('https://rsms.me/inter/inter.css');
}

:root {
  /* Colors */
  --color-white: #ffffff;
  --color-gray-50: #f9fafb;
  --color-gray-100: #f3f4f6;
  --color-gray-200: #e5e7eb;
  --color-gray-300: #d1d5db;
  --color-gray-400: #9ca3af;
  --color-gray-500: #6b7280;
  --color-gray-600: #4b5563;
  --color-gray-700: #374151;
  --color-gray-800: #1f2937;
  --color-gray-900: #111827;

  --color-blue-50: #eff6ff;
  --color-blue-100: #dbeafe;
  --color-blue-200: #bfdbfe;
  --color-blue-300: #93c5fd;
  --color-blue-400: #60a5fa;
  --color-blue-500: #3b82f6;
  --color-blue-600: #2563eb;
  --color-blue-700: #1d4ed8;
  --color-blue-800: #1e40af;
  --color-blue-900: #1e3a8a;

  --color-red-50: #fef2f2;
  --color-red-100: #fee2e2;
  --color-red-500: #ef4444;
  --color-red-600: #dc2626;
  --color-red-700: #b91c1c;

  --color-green-50: #f0fdf4;
  --color-green-100: #dcfce7;
  --color-green-500: #22c55e;
  --color-green-600: #16a34a;

  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  --spacing-2xl: 3rem;

  /* Border radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;

  /* Transitions */
  --transition-fast: 150ms ease-out;
  --transition-base: 200ms ease-out;
  --transition-slow: 300ms ease-out;

  /* Font sizes */
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-size-3xl: 1.875rem;

  /* Font weights */
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* Line heights */
  --line-height-tight: 1.25;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.75;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-base: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
}

* {
  @apply border-gray-200;
}

body {
  @apply bg-white text-gray-900 font-sans antialiased;
  color: rgb(17, 24, 39);
}

/* Typography */
h1 {
  @apply text-3xl font-bold tracking-tight;
}

h2 {
  @apply text-2xl font-bold tracking-tight;
}

h3 {
  @apply text-xl font-semibold;
}

h4 {
  @apply text-lg font-semibold;
}

p {
  @apply leading-relaxed;
}

a {
  @apply text-blue-600 hover:text-blue-700 transition-colors;
}

/* Utility classes */
.text-muted {
  @apply text-gray-600;
}

.text-subtle {
  @apply text-gray-500 text-sm;
}

.bg-hover {
  @apply transition-colors duration-150;
}

.focus-ring {
  @apply focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2;
}

/* Animations */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(0.5rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fadeIn var(--transition-base);
}

.animate-slide-up {
  animation: slideUp var(--transition-base);
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgb(156, 163, 175);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgb(107, 114, 128);
}
```

---

## 9. Router Setup (React Router v6)

```typescript
// app/routes.tsx

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ResponsiveLayout } from '@/components/ResponsiveLayout';
import { useAuthStore } from '@/lib/store/authStore';

// Page components (lazy-loaded)
const ArenaPage = React.lazy(() => import('@/pages/arena'));
const SideBySidePage = React.lazy(() => import('@/pages/side-by-side'));
const LivePage = React.lazy(() => import('@/pages/live'));
const LeaderboardPage = React.lazy(() => import('@/pages/leaderboard'));
const ProfilePage = React.lazy(() => import('@/pages/profile'));
const NotFoundPage = React.lazy(() => import('@/pages/404'));

export function AppRoutes() {
  const { isLoggedIn } = useAuthStore();
  const [voteCount, setVoteCount] = React.useState(0);
  const { setShowAuthModal } = useAuthStore();

  return (
    <ResponsiveLayout
      voteCount={voteCount}
      onAuthClick={() => setShowAuthModal(true)}
    >
      <React.Suspense
        fallback={
          <div className="flex h-full items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<Navigate to="/arena" replace />} />
          <Route path="/arena" element={<ArenaPage />} />
          <Route path="/arena/:id" element={<ArenaPage />} />
          <Route path="/side-by-side" element={<SideBySidePage />} />
          <Route path="/side-by-side/:id" element={<SideBySidePage />} />
          <Route path="/live" element={<LivePage />} />
          <Route path="/live/:id" element={<LivePage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />

          {/* Protected routes */}
          {isLoggedIn && (
            <Route path="/profile" element={<ProfilePage />} />
          )}

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </React.Suspense>
    </ResponsiveLayout>
  );
}
```

### App Entry Point

```typescript
// app/main.tsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from '@/app/routes';
import { useAuth } from '@/lib/hooks/useAuth';
import '@/styles/globals.css';

function App() {
  const { checkAuth } = useAuth();

  React.useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return <AppRoutes />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

---

## 10. Environment Configuration

```bash
# .env.local

REACT_APP_API_URL=http://localhost:8000
REACT_APP_ENV=development
REACT_APP_VERSION=0.1.0
```

```bash
# .env.production

REACT_APP_API_URL=https://api.vigen-arena.com
REACT_APP_ENV=production
REACT_APP_VERSION=0.1.0
```

---

## 11. Package.json Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "type-check": "tsc --noEmit",
    "lint": "eslint src --ext ts,tsx --report-unused-disable-directives",
    "format": "prettier --write 'src/**/*.{ts,tsx,css,json}'",
    "test": "vitest"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "zustand": "^4.4.0",
    "axios": "^1.6.0",
    "uuid": "^9.0.1",
    "@radix-ui/react-dialog": "^1.1.1",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-scroll-area": "^1.0.5",
    "@radix-ui/react-separator": "^1.0.3",
    "@radix-ui/react-avatar": "^1.0.4",
    "@radix-ui/react-alert-dialog": "^1.0.5",
    "@radix-ui/react-sheet": "^1.0.5",
    "@radix-ui/react-toast": "^1.1.5",
    "lucide-react": "^0.292.0",
    "tailwindcss": "^3.3.6",
    "clsx": "^2.0.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "tailwindcss": "^3.3.6",
    "postcss": "^8.4.31",
    "autoprefixer": "^10.4.16",
    "prettier": "^3.1.0",
    "eslint": "^8.54.0"
  }
}
```

---

## 12. Implementation Checklist

**Layout & Navigation:**
- [ ] Create `components/Topbar.tsx`
- [ ] Create `components/Sidebar.tsx`
- [ ] Create `components/MobileNav.tsx`
- [ ] Create `components/ResponsiveLayout.tsx`
- [ ] Create `app/layout.tsx` (root layout)

**Styling & Theme:**
- [ ] Create `tailwind.config.ts`
- [ ] Create `styles/globals.css`
- [ ] Install Shadcn/ui components
- [ ] Verify Inter font loads

**Constants & Config:**
- [ ] Create `lib/constants/vi.ts` (Vietnamese labels)
- [ ] Create `.env.local` (development env vars)
- [ ] Create `.env.production` (production env vars)

**Router & Entry:**
- [ ] Create `app/routes.tsx`
- [ ] Create `app/main.tsx`
- [ ] Set up React Router

**Testing:**
- [ ] Verify responsive behavior (mobile/tablet/desktop)
- [ ] Check auth modal integration
- [ ] Test sidebar navigation
- [ ] Verify vote counter displays correctly
- [ ] Check mobile drawer toggle
- [ ] Verify color contrast (WCAG AA)
