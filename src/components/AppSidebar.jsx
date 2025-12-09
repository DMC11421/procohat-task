import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Home, Users, FileText, Building2, Wallet, LogOut } from 'lucide-react';
import { useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const menuItems = [
  {
    title: 'Dashboard',
    url: '/',
    icon: Home,
    testId: 'nav-dashboard',
  },
  {
    title: 'User Management',
    url: '/user-management',
    icon: Users,
    testId: 'nav-user-management',
  },
  {
    title: 'Document Management',
    url: '/document-management',
    icon: FileText,
    testId: 'nav-document-management',
  },
  {
    title: 'Clinic Management',
    url: '/clinic-management',
    icon: Building2,
    testId: 'nav-clinic-management',
  },
];

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { user, signOut } = useAuth();
  const { setOpenMobile } = useSidebar();

  const handleNavigation = (url) => {
    setLocation(url);
    // Close sidebar on mobile after navigation
    setOpenMobile(false);
  };

  const handleSignOut = async () => {
    await signOut();
    setLocation('/login');
    setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 p-2 group-data-[collapsible=icon]:justify-center">
          <Wallet className="h-6 w-6 text-primary flex-shrink-0" />
          <span className="text-lg font-bold group-data-[collapsible=icon]:hidden truncate">ProCoHat</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => handleNavigation(item.url)}
                    isActive={location === item.url}
                    data-testid={item.testId}
                    className="group-data-[collapsible=icon]:justify-center"
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t">
        {user && (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" className="group-data-[collapsible=icon]:justify-center">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.photoURL || undefined} alt={user.displayName || user.email || 'User'} />
                  <AvatarFallback>
                    {user.email?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                  <span className="font-semibold">{user.displayName || 'User'}</span>
                  <span className="text-xs text-muted-foreground">{user.email}</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={handleSignOut} 
                data-testid="button-signout"
                className="group-data-[collapsible=icon]:justify-center"
              >
                <LogOut className="h-4 w-4" />
                <span className="group-data-[collapsible=icon]:hidden">Sign out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
